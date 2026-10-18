-- M4: каталог элементов (items) и предпочтения пользователей

------------------------------------------------------------------
-- 1. Категории (набор ведёт администратор проекта через миграции)
------------------------------------------------------------------
create table public.categories (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  emoji text not null,
  -- подпись поля «текст под названием»: для персонажа — «Вселенная», для песни — «Исполнитель» и т.д.
  subtitle_label text,
  sort_order smallint not null default 0
);

alter table public.categories enable row level security;
create policy "categories_select" on public.categories for select using (true);
revoke insert, update, delete on public.categories from anon, authenticated;

insert into public.categories (slug, name, emoji, subtitle_label, sort_order) values
  ('movies',     'Фильмы',     '🎬', 'Год или режиссёр',      10),
  ('series',     'Сериалы',    '📺', 'Год или студия',        20),
  ('anime',      'Аниме',      '🎌', 'Студия или год',        30),
  ('games',      'Игры',       '🎮', 'Серия или разработчик', 40),
  ('music',      'Музыка',     '🎵', 'Исполнитель или группа', 50),
  ('characters', 'Персонажи',  '🦸', 'Вселенная',             60),
  ('books',      'Книги',      '📚', 'Автор',                 70),
  ('food',       'Еда',        '🍜', 'Кухня или заметка',     80);

------------------------------------------------------------------
-- 2. Каталог элементов
------------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  category_id smallint not null references public.categories(id),
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  subtitle text check (subtitle is null or (char_length(subtitle) between 1 and 120 and subtitle = btrim(subtitle))),
  image_url text check (image_url is null or (char_length(image_url) <= 500 and image_url ~* '^https://')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Один и тот же элемент (категория + название + подпись) нельзя создать дважды, регистр не важен
create unique index items_unique_idx
  on public.items (category_id, lower(title), lower(coalesce(subtitle, '')));
create index items_category_title_idx on public.items (category_id, lower(title));
create index items_created_by_idx on public.items (created_by, created_at);

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- Защита от спама: не более 50 новых элементов в сутки от одного пользователя
create or replace function public.limit_item_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.items
      where created_by = new.created_by and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Слишком много новых элементов за сутки (лимит 50)';
  end if;
  return new;
end;
$$;

create trigger items_limit_creation
  before insert on public.items
  for each row execute function public.limit_item_creation();

------------------------------------------------------------------
-- 3. Предпочтения: оценка элемента от -2 до 2 (нет строки = не оценено)
--    2 обожаю · 1 нравится · 0 нейтрально · -1 не нравится · -2 ненавижу
------------------------------------------------------------------
create table public.preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  rating smallint not null check (rating between -2 and 2),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index preferences_item_idx on public.preferences (item_id);

create trigger preferences_set_updated_at
  before update on public.preferences
  for each row execute function public.set_updated_at();

-- Кто видит предпочтения владельца (по умолчанию — только он сам)
alter table public.profiles
  add column preferences_visibility text not null default 'private'
  check (preferences_visibility in ('public', 'friends', 'private'));

------------------------------------------------------------------
-- 4. Функции
------------------------------------------------------------------
create or replace function public.can_see_preferences(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_owner = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = p_owner
          and (p.preferences_visibility = 'public'
               or (p.preferences_visibility = 'friends' and public.are_friends(auth.uid(), p_owner)))
      );
$$;

-- Элемент «занят», если его оценил кто-то кроме автора — тогда автор уже не может его править
-- (когда появятся тир-листы M5, добавить сюда и их записи)
create or replace function public.item_is_shared(p_item uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.preferences pr
    where pr.item_id = p_item
      and pr.user_id is distinct from (select i.created_by from public.items i where i.id = p_item)
  );
$$;

-- Просмотр каталога: фильтр по категории и поиск по названию/подписи, плюс моя оценка
create or replace function public.browse_items(
  p_category text default null,
  p_query text default null,
  p_limit int default 30,
  p_offset int default 0
)
returns table (
  id uuid,
  category_slug text,
  category_name text,
  category_emoji text,
  title text,
  subtitle text,
  image_url text,
  created_by uuid,
  my_rating smallint
)
language sql
stable
as $$
  with q as (
    select case when p_query is null or btrim(p_query) = '' then null
                else replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') end as s
  )
  select i.id, c.slug, c.name, c.emoji, i.title, i.subtitle, i.image_url, i.created_by, pr.rating
  from public.items i
  join public.categories c on c.id = i.category_id
  left join public.preferences pr on pr.item_id = i.id and pr.user_id = auth.uid()
  cross join q
  where (p_category is null or c.slug = p_category)
    and (q.s is null or i.title ilike '%' || q.s || '%' or i.subtitle ilike '%' || q.s || '%')
  order by case when q.s is not null and lower(i.title) = lower(btrim(p_query)) then 0 else 1 end,
           lower(i.title), i.id
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

------------------------------------------------------------------
-- 5. Права доступа (RLS)
------------------------------------------------------------------
alter table public.items enable row level security;

create policy "items_select" on public.items for select using (true);

create policy "items_insert" on public.items
  for insert to authenticated with check (created_by = auth.uid());

-- Автор может править свой элемент, пока его не оценил никто другой
create policy "items_update_own_unshared" on public.items
  for update to authenticated
  using (created_by = auth.uid() and not public.item_is_shared(id))
  with check (created_by = auth.uid());

-- Удаления нет: на элементы будут ссылаться предпочтения и тир-листы
revoke delete on public.items from anon, authenticated;

alter table public.preferences enable row level security;

create policy "preferences_select" on public.preferences
  for select using (user_id = auth.uid() or public.can_see_preferences(user_id));

create policy "preferences_insert_own" on public.preferences
  for insert to authenticated with check (user_id = auth.uid());

create policy "preferences_update_own" on public.preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "preferences_delete_own" on public.preferences
  for delete to authenticated using (user_id = auth.uid());

------------------------------------------------------------------
-- 6. Хранилище картинок элементов (Supabase Storage)
--    Картинки уменьшаются в браузере до ~512 px, лимит файла 512 КБ.
------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Загружать можно только в свою папку <user_id>/...
create policy "item_images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
