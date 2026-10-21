-- M6: группы сравнения
-- Владелец приглашает ДРУЗЕЙ; участник сам решает, чем делится с группой:
--   share_tests — последние результаты тестов, share_preferences — оценки каталога,
--   тир-листы — только те, которые участник сам прикрепил к группе.
-- Данные участников читаются ТОЛЬКО через функции ниже (и только участникам с статусом joined);
-- обычная приватность профилей/результатов/предпочтений при этом не ослабляется.

------------------------------------------------------------------
-- 1. Таблицы
------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60 and name = btrim(name)),
  created_at timestamptz not null default now()
);
create index groups_owner_idx on public.groups (owner_id);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'joined')),
  share_tests boolean not null default false,
  share_preferences boolean not null default false,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.group_tierlists (
  group_id uuid not null references public.groups(id) on delete cascade,
  tierlist_id uuid not null references public.tierlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attached_at timestamptz not null default now(),
  primary key (group_id, tierlist_id)
);
create index group_tierlists_user_idx on public.group_tierlists (group_id, user_id);

------------------------------------------------------------------
-- 2. Помощники для прав
------------------------------------------------------------------
create or replace function public.is_group_member(p_group uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members m
                 where m.group_id = p_group and m.user_id = p_user and m.status = 'joined');
$$;

create or replace function public.is_group_participant(p_group uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members m where m.group_id = p_group and m.user_id = p_user);
$$;

------------------------------------------------------------------
-- 3. RLS: чтение — участникам; запись — только через функции
------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_tierlists enable row level security;

revoke all on public.groups, public.group_members, public.group_tierlists from anon;
revoke insert, update, delete on public.group_members, public.group_tierlists from authenticated;
revoke insert, update on public.groups from authenticated;
grant update (name) on public.groups to authenticated;

create policy "groups_select" on public.groups for select to authenticated
  using (owner_id = auth.uid() or public.is_group_participant(id, auth.uid()));
create policy "groups_update_owner" on public.groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "groups_delete_owner" on public.groups for delete to authenticated
  using (owner_id = auth.uid());

create policy "group_members_select" on public.group_members for select to authenticated
  using (user_id = auth.uid() or public.is_group_member(group_id, auth.uid()));

create policy "group_tierlists_select" on public.group_tierlists for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

------------------------------------------------------------------
-- 4. Управление группой (RPC)
------------------------------------------------------------------
create or replace function public.create_group(
  p_name text,
  p_share_tests boolean default true,
  p_share_preferences boolean default true
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Нужно войти'; end if;
  if (select count(*) from public.groups where owner_id = auth.uid()) >= 20 then
    raise exception 'Слишком много групп (лимит 20)';
  end if;
  insert into public.groups (owner_id, name) values (auth.uid(), btrim(p_name)) returning id into v_id;
  insert into public.group_members (group_id, user_id, status, share_tests, share_preferences, invited_by)
  values (v_id, auth.uid(), 'joined', p_share_tests, p_share_preferences, auth.uid());
  return v_id;
end; $$;

create or replace function public.invite_to_group(p_group uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.groups g where g.id = p_group and g.owner_id = auth.uid()) then
    raise exception 'Приглашать может только владелец группы';
  end if;
  if not public.are_friends(auth.uid(), p_user) then
    raise exception 'В группу можно приглашать только друзей';
  end if;
  if exists (select 1 from public.group_members where group_id = p_group and user_id = p_user) then
    raise exception 'Этот человек уже в группе или приглашён';
  end if;
  if (select count(*) from public.group_members where group_id = p_group) >= 12 then
    raise exception 'В группе не может быть больше 12 человек';
  end if;
  insert into public.group_members (group_id, user_id, status, invited_by)
  values (p_group, p_user, 'invited', auth.uid());
end; $$;

create or replace function public.respond_group_invite(
  p_group uuid,
  p_accept boolean,
  p_share_tests boolean default false,
  p_share_preferences boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.group_members
                 where group_id = p_group and user_id = auth.uid() and status = 'invited') then
    raise exception 'Приглашение не найдено';
  end if;
  if p_accept then
    update public.group_members
    set status = 'joined', share_tests = coalesce(p_share_tests, false), share_preferences = coalesce(p_share_preferences, false)
    where group_id = p_group and user_id = auth.uid();
  else
    delete from public.group_members where group_id = p_group and user_id = auth.uid();
  end if;
end; $$;

create or replace function public.update_group_sharing(p_group uuid, p_share_tests boolean, p_share_preferences boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.group_members
  set share_tests = coalesce(p_share_tests, false), share_preferences = coalesce(p_share_preferences, false)
  where group_id = p_group and user_id = auth.uid() and status = 'joined';
  if not found then raise exception 'Вы не участник этой группы'; end if;
end; $$;

create or replace function public.leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.groups where id = p_group and owner_id = auth.uid()) then
    raise exception 'Владелец не может выйти из группы — удалите её';
  end if;
  delete from public.group_tierlists where group_id = p_group and user_id = auth.uid();
  delete from public.group_members where group_id = p_group and user_id = auth.uid();
  if not found then raise exception 'Вы не участник этой группы'; end if;
end; $$;

create or replace function public.remove_group_member(p_group uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.groups where id = p_group and owner_id = auth.uid()) then
    raise exception 'Удалять участников может только владелец группы';
  end if;
  if p_user = auth.uid() then
    raise exception 'Владельца удалить нельзя — удалите группу';
  end if;
  delete from public.group_tierlists where group_id = p_group and user_id = p_user;
  delete from public.group_members where group_id = p_group and user_id = p_user;
end; $$;

create or replace function public.set_group_tierlist(p_group uuid, p_tierlist uuid, p_attached boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_group_member(p_group, auth.uid()) then
    raise exception 'Вы не участник этой группы';
  end if;
  if not public.owns_tierlist(p_tierlist) then
    raise exception 'Прикреплять можно только свои тир-листы';
  end if;
  if p_attached then
    if (select count(*) from public.group_tierlists where group_id = p_group and user_id = auth.uid()) >= 10 then
      raise exception 'Можно прикрепить не больше 10 тир-листов';
    end if;
    insert into public.group_tierlists (group_id, tierlist_id, user_id)
    values (p_group, p_tierlist, auth.uid()) on conflict do nothing;
  else
    delete from public.group_tierlists where group_id = p_group and tierlist_id = p_tierlist and user_id = auth.uid();
  end if;
end; $$;

------------------------------------------------------------------
-- 5. Чтение для сравнения (только участникам со статусом joined)
------------------------------------------------------------------
create or replace function public.my_groups()
returns table (id uuid, name text, owner_id uuid, owner_username text, my_status text, member_count int, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.owner_id, op.username, gm.status,
         (select count(*) from public.group_members m where m.group_id = g.id and m.status = 'joined')::int,
         g.created_at
  from public.groups g
  join public.group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  join public.profiles op on op.id = g.owner_id
  order by gm.status desc, g.created_at desc;
$$;

create or replace function public.group_members_view(p_group uuid)
returns table (user_id uuid, username text, display_name text, status text, share_tests boolean, share_preferences boolean, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.username, p.display_name, m.status, m.share_tests, m.share_preferences, (m.user_id = g.owner_id)
  from public.group_members m
  join public.groups g on g.id = m.group_id
  join public.profiles p on p.id = m.user_id
  where m.group_id = p_group and public.is_group_member(p_group, auth.uid())
  order by (m.user_id = g.owner_id) desc, m.status desc, p.username;
$$;

create or replace function public.group_tests(p_group uuid)
returns table (user_id uuid, test_slug text, test_version int, scores jsonb, taken_at timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (r.user_id, r.test_slug) r.user_id, r.test_slug, r.test_version, r.scores, r.taken_at
  from public.test_results r
  join public.group_members m
    on m.user_id = r.user_id and m.group_id = p_group and m.status = 'joined' and m.share_tests
  where public.is_group_member(p_group, auth.uid())
  order by r.user_id, r.test_slug, r.taken_at desc;
$$;

create or replace function public.group_preferences(p_group uuid)
returns table (
  user_id uuid, item_id uuid, rating smallint, title text, subtitle text, image_url text,
  category_slug text, category_name text, category_emoji text, category_sort smallint
)
language sql stable security definer set search_path = public as $$
  select pr.user_id, i.id, pr.rating, i.title, i.subtitle, i.image_url, c.slug, c.name, c.emoji, c.sort_order
  from public.preferences pr
  join public.group_members m
    on m.user_id = pr.user_id and m.group_id = p_group and m.status = 'joined' and m.share_preferences
  join public.items i on i.id = pr.item_id
  join public.categories c on c.id = i.category_id
  where public.is_group_member(p_group, auth.uid());
$$;

-- Оценка по тиру: верхний тир = 1, нижний = 0 (если тир один — 1). В банке лежащие записи не учитываются.
create or replace function public.group_tier_scores(p_group uuid)
returns table (
  user_id uuid, tierlist_id uuid, tierlist_title text, item_id uuid, title text, subtitle text, image_url text,
  category_slug text, category_name text, category_emoji text, tier_label text, tier_score double precision
)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select t.id, t.tierlist_id, t.label,
           row_number() over (partition by t.tierlist_id order by t.position, t.id) - 1 as idx,
           count(*) over (partition by t.tierlist_id) as n
    from public.tiers t
  )
  select gt.user_id, tl.id, tl.title, i.id, i.title, i.subtitle, i.image_url, c.slug, c.name, c.emoji, r.label,
         case when r.n > 1 then 1 - r.idx::double precision / (r.n - 1) else 1::double precision end
  from public.group_tierlists gt
  join public.group_members m on m.group_id = gt.group_id and m.user_id = gt.user_id and m.status = 'joined'
  join public.tierlists tl on tl.id = gt.tierlist_id
  join public.tierlist_entries e on e.tierlist_id = tl.id and e.tier_id is not null
  join ranked r on r.id = e.tier_id
  join public.items i on i.id = e.item_id
  join public.categories c on c.id = i.category_id
  where gt.group_id = p_group and public.is_group_member(p_group, auth.uid());
$$;
