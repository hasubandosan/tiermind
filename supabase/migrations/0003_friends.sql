-- M3: друзья, поиск людей, публичные профили, приватность результатов

------------------------------------------------------------------
-- 1. Дружба
------------------------------------------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- Между двумя людьми может быть только одна связь, независимо от направления
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

-- Менять можно только status (и только принимая заявку)
revoke all on public.friendships from anon;
revoke update on public.friendships from authenticated;
grant update (status) on public.friendships to authenticated;

create policy "friendships_select" on public.friendships
  for select using (auth.uid() in (requester_id, addressee_id));

create policy "friendships_insert" on public.friendships
  for insert with check (requester_id = auth.uid() and status = 'pending');

create policy "friendships_accept" on public.friendships
  for update using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

-- Отменить заявку / отклонить / удалить из друзей может любая из сторон
create policy "friendships_delete" on public.friendships
  for delete using (auth.uid() in (requester_id, addressee_id));

------------------------------------------------------------------
-- 2. Вспомогательные функции
------------------------------------------------------------------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- Мои связи (друзья + заявки) вместе с базовыми данными второй стороны
create or replace function public.my_friendships()
returns table (
  friendship_id uuid,
  status text,
  i_am_requester boolean,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.status, (f.requester_id = auth.uid()),
         p.id, p.username, p.display_name, p.avatar_url, f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by f.created_at desc;
$$;

-- Карточка профиля по нику: базовые данные видны всем (кроме private), детали — по правилам видимости
create or replace function public.profile_card(p_username text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  visibility text,
  bio text,
  can_view boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.visibility,
         case when v.ok then p.bio end,
         v.ok
  from public.profiles p
  cross join lateral (
    select (p.visibility = 'public'
            or p.id = auth.uid()
            or (p.visibility = 'friends' and public.are_friends(auth.uid(), p.id))) as ok
  ) v
  where lower(p.username) = lower(p_username)
    and (p.visibility <> 'private' or p.id = auth.uid());
$$;

-- Поиск людей (только для вошедших; private-профили не ищутся)
create or replace function public.search_profiles(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  visibility text
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') as s
  )
  select p.id, p.username, p.display_name, p.avatar_url, p.visibility
  from public.profiles p, q
  where auth.uid() is not null
    and length(trim(p_query)) >= 2
    and p.id <> auth.uid()
    and p.visibility <> 'private'
    and (p.username ilike q.s || '%' or p.display_name ilike '%' || q.s || '%')
  order by p.username
  limit 20;
$$;

------------------------------------------------------------------
-- 3. Видимость «friends» для профилей и результатов тестов
------------------------------------------------------------------
drop policy "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    visibility = 'public'
    or id = auth.uid()
    or (visibility = 'friends' and public.are_friends(auth.uid(), id))
  );

drop policy "test_results_select" on public.test_results;
create policy "test_results_select" on public.test_results
  for select using (
    user_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'friends' and public.are_friends(auth.uid(), user_id))
  );

-- Сырые ответы (answers) теперь не читаются клиентом вообще; наружу отдаём только итоги
revoke select on public.test_results from anon, authenticated;
grant select (id, user_id, test_slug, test_version, scores, visibility, taken_at)
  on public.test_results to anon, authenticated;

-- Автоник при регистрации: 15 символов вместо 10, чтобы исключить случайные совпадения (лимит ника — 20 символов)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 15));
  return new;
end;
$$;
