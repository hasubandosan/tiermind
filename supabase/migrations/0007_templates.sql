-- M7: шаблоны тир-листов
-- Любой может сделать СВОЙ тир-лист шаблоном (менять его может только автор).
-- Другие «проходят» шаблон: получают свою приватную копию (те же тиры и элементы, все в банке) и расставляют по-своему.
-- Результаты прохождений сравниваются (сообщество, вы и другие), но только те, что их авторы открыли.

------------------------------------------------------------------
-- 1. Новые поля
------------------------------------------------------------------
alter table public.tierlists
  add column is_template boolean not null default false,
  add column source_template_id uuid references public.tierlists(id) on delete set null;

create index tierlists_source_idx on public.tierlists (source_template_id) where source_template_id is not null;
create index tierlists_template_idx on public.tierlists (is_template) where is_template;

grant update (is_template) on public.tierlists to authenticated;

------------------------------------------------------------------
-- 2. Правила для шаблонов
------------------------------------------------------------------
create or replace function public.check_template_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_template and (tg_op = 'INSERT' or not old.is_template) then
    if exists (select 1 from public.tierlist_entries where child_tierlist_id = new.id) then
      raise exception 'Вложенный тир-лист нельзя сделать шаблоном — сделайте шаблоном родительский';
    end if;
    if (select count(*) from public.tierlists where owner_id = new.owner_id and is_template) >= 50 then
      raise exception 'Слишком много шаблонов (лимит 50)';
    end if;
  end if;
  return new;
end; $$;
create trigger tierlists_template_check
  before insert or update of is_template on public.tierlists
  for each row execute function public.check_template_flag();

-- check_child_tierlist: те же правила, что в M5, + шаблон нельзя вложить в другой тир-лист
create or replace function public.check_child_tierlist()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_child_owner uuid;
begin
  if new.child_tierlist_id is null then
    return new;
  end if;
  select owner_id into v_owner from public.tierlists where id = new.tierlist_id;
  select owner_id into v_child_owner from public.tierlists where id = new.child_tierlist_id;
  if v_child_owner is null then
    raise exception 'Вложенный тир-лист не найден';
  end if;
  if v_child_owner <> v_owner then
    raise exception 'Вложенным может быть только ваш собственный тир-лист';
  end if;
  if exists (select 1 from public.tierlists where id = new.child_tierlist_id and is_template) then
    raise exception 'Шаблон нельзя вложить в другой тир-лист';
  end if;
  if exists (
    with recursive up as (
      select new.tierlist_id as id, 0 as depth
      union all
      select e.tierlist_id, up.depth + 1
      from public.tierlist_entries e join up on e.child_tierlist_id = up.id
      where up.depth < 50
    )
    select 1 from up where id = new.child_tierlist_id
  ) then
    raise exception 'Нельзя вложить тир-лист сам в себя (получится цикл)';
  end if;
  return new;
end; $$;

------------------------------------------------------------------
-- 3. Видимость: вложенные списки видны вместе с видимым шаблоном-родителем
------------------------------------------------------------------
create or replace function public.can_view_tierlist(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with recursive up as (
    select t.id, t.owner_id, t.visibility, t.is_template, 0 as depth
    from public.tierlists t where t.id = p_id
    union all
    select pt.id, pt.owner_id, pt.visibility, pt.is_template, up.depth + 1
    from up
    join public.tierlist_entries e on e.child_tierlist_id = up.id
    join public.tierlists pt on pt.id = e.tierlist_id
    where up.depth < 20
  )
  select exists (
    select 1 from up
    where up.owner_id = auth.uid()
       or (up.depth = 0 and (up.visibility = 'public'
                              or (up.visibility = 'friends' and public.are_friends(auth.uid(), up.owner_id))))
       or (up.is_template and (up.visibility = 'public'
                                or (up.visibility = 'friends' and public.are_friends(auth.uid(), up.owner_id))))
  );
$$;

-- Владельца проверяем прямо в политике: функция не видит строку, которая вставляется в этом же запросе (INSERT ... RETURNING)
drop policy "tierlists_select" on public.tierlists;
create policy "tierlists_select" on public.tierlists for select
  using (owner_id = auth.uid() or public.can_view_tierlist(id));

------------------------------------------------------------------
-- 4. «Пройти шаблон» = создать свою копию
------------------------------------------------------------------
-- Копирует тир-лист (и вложенные, до глубины 5) для текущего пользователя:
-- приватный, те же тиры, все элементы в банке в случайном порядке (расстановка и заметки автора не копируются).
create or replace function public.copy_tierlist_tree(p_src uuid, p_depth int)
returns uuid language plpgsql as $$
declare
  v_new uuid;
  r record;
  v_child uuid;
  v_entry uuid;
begin
  insert into public.tierlists (owner_id, title, note, tags, visibility, source_template_id)
  select auth.uid(), t.title, t.note, t.tags, 'private', t.id
  from public.tierlists t where t.id = p_src
  returning id into v_new;
  if v_new is null then
    raise exception 'Шаблон не найден';
  end if;

  insert into public.tiers (tierlist_id, label, color, position)
  select v_new, label, color, position from public.tiers where tierlist_id = p_src;

  for r in
    select e.item_id, e.child_tierlist_id,
           row_number() over (order by random()) - 1 as pos
    from public.tierlist_entries e where e.tierlist_id = p_src
  loop
    insert into public.tierlist_entries (tierlist_id, item_id, position)
    values (v_new, r.item_id, r.pos)
    returning id into v_entry;
    if r.child_tierlist_id is not null and p_depth < 5 then
      v_child := null;
      if exists (select 1 from public.tierlists where id = r.child_tierlist_id) then -- виден нам (RLS)
        v_child := public.copy_tierlist_tree(r.child_tierlist_id, p_depth + 1);
        update public.tierlist_entries set child_tierlist_id = v_child where id = v_entry;
      end if;
    end if;
  end loop;
  return v_new;
end; $$;

create or replace function public.start_from_template(p_template uuid)
returns uuid language plpgsql as $$
declare v_count int;
begin
  if auth.uid() is null then raise exception 'Нужно войти'; end if;
  if not exists (select 1 from public.tierlists where id = p_template and is_template) then
    raise exception 'Шаблон не найден';
  end if;
  with recursive d as (
    select p_template as id, 0 as depth
    union all
    select e.child_tierlist_id, d.depth + 1
    from d join public.tierlist_entries e on e.tierlist_id = d.id
    where e.child_tierlist_id is not null and d.depth < 5
  )
  select count(*) into v_count from d;
  if v_count > 60 then
    raise exception 'Шаблон слишком большой (больше 60 вложенных тир-листов)';
  end if;
  return public.copy_tierlist_tree(p_template, 0);
end; $$;

------------------------------------------------------------------
-- 5. Списки и результаты
------------------------------------------------------------------
-- list_tierlists получает признаки шаблона/прохождения (меняется состав колонок — пересоздаём)
drop function public.list_tierlists(uuid);
create function public.list_tierlists(p_owner uuid)
returns table (
  id uuid, owner_id uuid, title text, note text, tags text[], visibility text,
  updated_at timestamptz, entries_count int, parent_list_id uuid,
  is_template boolean, source_template_id uuid, source_template_title text
)
language sql stable as $$
  select t.id, t.owner_id, t.title, t.note, t.tags, t.visibility, t.updated_at,
         (select count(*) from public.tierlist_entries e where e.tierlist_id = t.id)::int,
         (select e.tierlist_id from public.tierlist_entries e where e.child_tierlist_id = t.id limit 1),
         t.is_template, t.source_template_id,
         (select s.title from public.tierlists s where s.id = t.source_template_id)
  from public.tierlists t
  where t.owner_id = p_owner
  order by t.updated_at desc;
$$;

-- Галерея шаблонов (и один шаблон по p_id): только видимые текущему пользователю
create or replace function public.list_templates(
  p_query text default null,
  p_tag text default null,
  p_sort text default 'popular',
  p_limit int default 30,
  p_offset int default 0,
  p_id uuid default null
)
returns table (
  id uuid, owner_id uuid, owner_username text, owner_display_name text,
  title text, note text, tags text[], visibility text,
  entries_count int, passes_count int, updated_at timestamptz, my_pass_id uuid
)
language sql stable security definer set search_path = public as $$
  with q as (
    select case when p_query is null or btrim(p_query) = '' then null
                else replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') end as s
  ), base as (
    select t.id, t.owner_id, p.username as owner_username, p.display_name as owner_display_name,
           t.title, t.note, t.tags, t.visibility,
           (select count(*) from public.tierlist_entries e where e.tierlist_id = t.id)::int as entries_count,
           (select count(distinct l.owner_id) from public.tierlists l
             where l.source_template_id = t.id and not l.is_template)::int as passes_count,
           t.updated_at,
           (select l.id from public.tierlists l
             where l.source_template_id = t.id and not l.is_template and l.owner_id = auth.uid()
             order by l.updated_at desc limit 1) as my_pass_id
    from public.tierlists t
    join public.profiles p on p.id = t.owner_id
    cross join q
    where t.is_template
      and public.can_view_tierlist(t.id)
      and (p_id is null or t.id = p_id)
      and (p_tag is null or p_tag = any (t.tags))
      and (q.s is null or t.title ilike '%' || q.s || '%' or coalesce(t.note, '') ilike '%' || q.s || '%')
  )
  select * from base
  order by case when p_sort = 'new' then 0 else base.passes_count end desc, base.updated_at desc
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

-- Открытые (видимые вам) прохождения шаблона: по одному, последнему, на человека
create or replace function public.template_passes(p_template uuid)
returns table (
  tierlist_id uuid, owner_id uuid, username text, display_name text,
  placed int, total int, updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select * from (
    select distinct on (l.owner_id)
           l.id, l.owner_id, p.username, p.display_name,
           (select count(*) from public.tierlist_entries e where e.tierlist_id = l.id and e.tier_id is not null)::int,
           (select count(*) from public.tierlist_entries e where e.tierlist_id = l.id)::int,
           l.updated_at
    from public.tierlists l
    join public.profiles p on p.id = l.owner_id
    where l.source_template_id = p_template and not l.is_template and public.can_view_tierlist(l.id)
    order by l.owner_id, l.updated_at desc
  ) x
  order by x.updated_at desc
  limit 100;
$$;

-- Оценки по тирам (1 — верхний, 0 — нижний) из тех же прохождений; в банке лежащие элементы не учитываются
create or replace function public.template_scores(p_template uuid)
returns table (user_id uuid, tierlist_id uuid, item_id uuid, tier_label text, tier_score double precision)
language sql stable security definer set search_path = public as $$
  with latest as (
    select * from (
      select distinct on (l.owner_id) l.id, l.owner_id, l.updated_at
      from public.tierlists l
      where l.source_template_id = p_template and not l.is_template and public.can_view_tierlist(l.id)
      order by l.owner_id, l.updated_at desc
    ) y
    order by y.updated_at desc limit 100
  ), ranked as (
    select t.id, t.label,
           row_number() over (partition by t.tierlist_id order by t.position, t.id) - 1 as idx,
           count(*) over (partition by t.tierlist_id) as n
    from public.tiers t where t.tierlist_id in (select id from latest)
  )
  select lt.owner_id, lt.id, e.item_id, r.label,
         case when r.n > 1 then 1 - r.idx::double precision / (r.n - 1) else 1::double precision end
  from latest lt
  join public.tierlist_entries e on e.tierlist_id = lt.id and e.tier_id is not null
  join ranked r on r.id = e.tier_id;
$$;
