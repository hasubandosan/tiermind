-- M5: вложенные тир-листы
-- Тир-лист → тиры (ряды S/A/B...) → записи (элементы из общего каталога).
-- Запись может вести во вложенный тир-лист (child_tierlist_id). Записи без тира (tier_id is null) — «банк».

------------------------------------------------------------------
-- 1. Таблицы
------------------------------------------------------------------
create table public.tierlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  note text check (note is null or char_length(note) <= 300),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  visibility text not null default 'private' check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tierlists_owner_idx on public.tierlists (owner_id, updated_at desc);

create table public.tiers (
  id uuid primary key default gen_random_uuid(),
  tierlist_id uuid not null references public.tierlists(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 20),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  position int not null default 0,
  unique (id, tierlist_id)
);
create index tiers_list_idx on public.tiers (tierlist_id, position);

create table public.tierlist_entries (
  id uuid primary key default gen_random_uuid(),
  tierlist_id uuid not null references public.tierlists(id) on delete cascade,
  tier_id uuid,
  item_id uuid not null references public.items(id),
  position int not null default 0,
  note text check (note is null or char_length(note) <= 300),
  child_tierlist_id uuid references public.tierlists(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tierlist_id, item_id),
  -- тир обязан принадлежать тому же тир-листу; при удалении тира запись уходит в банк
  foreign key (tier_id, tierlist_id) references public.tiers (id, tierlist_id) on delete set null (tier_id)
);
create index entries_list_idx on public.tierlist_entries (tierlist_id, tier_id, position);
create index entries_item_idx on public.tierlist_entries (item_id);
-- у вложенного тир-листа ровно один родитель
create unique index entries_child_idx on public.tierlist_entries (child_tierlist_id) where child_tierlist_id is not null;

------------------------------------------------------------------
-- 2. Вспомогательные функции для прав
------------------------------------------------------------------
create or replace function public.owns_tierlist(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tierlists t where t.id = p_id and t.owner_id = auth.uid());
$$;

create or replace function public.can_view_tierlist(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tierlists t
    where t.id = p_id
      and (t.owner_id = auth.uid()
           or t.visibility = 'public'
           or (t.visibility = 'friends' and public.are_friends(auth.uid(), t.owner_id)))
  );
$$;

------------------------------------------------------------------
-- 3. Триггеры: лимиты, проверка вложенности, обновление updated_at
------------------------------------------------------------------
create or replace function public.limit_tierlists()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.tierlists where owner_id = new.owner_id) >= 200 then
    raise exception 'Слишком много тир-листов (лимит 200)';
  end if;
  return new;
end; $$;
create trigger tierlists_limit before insert on public.tierlists
  for each row execute function public.limit_tierlists();

create or replace function public.limit_tiers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.tiers where tierlist_id = new.tierlist_id) >= 20 then
    raise exception 'Слишком много тиров (лимит 20)';
  end if;
  return new;
end; $$;
create trigger tiers_limit before insert on public.tiers
  for each row execute function public.limit_tiers();

create or replace function public.limit_entries()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.tierlist_entries where tierlist_id = new.tierlist_id) >= 500 then
    raise exception 'Слишком много элементов в тир-листе (лимит 500)';
  end if;
  return new;
end; $$;
create trigger entries_limit before insert on public.tierlist_entries
  for each row execute function public.limit_entries();

-- Вложенный тир-лист: тот же владелец, не сам на себя, без циклов
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
  -- идём вверх от текущего тир-листа: если встретим вкладываемый — это цикл
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
create trigger entries_check_child
  before insert or update of child_tierlist_id on public.tierlist_entries
  for each row execute function public.check_child_tierlist();

-- При удалении тира его записи переходят в конец банка (сохраняя свой порядок), а не «слипаются» с позициями банка
create or replace function public.tier_entries_to_pool()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  with base as (
    select coalesce(max(position), -1) + 1 as b
    from public.tierlist_entries where tierlist_id = old.tierlist_id and tier_id is null
  ), moved as (
    select id, row_number() over (order by position, created_at, id) - 1 as rn
    from public.tierlist_entries where tier_id = old.id
  )
  update public.tierlist_entries e
  set tier_id = null, position = base.b + moved.rn
  from moved, base where e.id = moved.id;
  return old;
end; $$;
create trigger tiers_entries_to_pool before delete on public.tiers
  for each row execute function public.tier_entries_to_pool();

-- Любое изменение тиров/записей «освежает» тир-лист (сортировка по updated_at)
create or replace function public.touch_tierlist()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.tierlists set updated_at = now()
  where id = coalesce(new.tierlist_id, old.tierlist_id);
  return null;
end; $$;
create trigger tiers_touch after insert or update or delete on public.tiers
  for each row execute function public.touch_tierlist();
create trigger entries_touch after insert or update or delete on public.tierlist_entries
  for each row execute function public.touch_tierlist();
create trigger tierlists_set_updated_at before update on public.tierlists
  for each row execute function public.set_updated_at();

------------------------------------------------------------------
-- 4. Права доступа (RLS)
------------------------------------------------------------------
alter table public.tierlists enable row level security;
alter table public.tiers enable row level security;
alter table public.tierlist_entries enable row level security;

revoke update on public.tierlists, public.tiers, public.tierlist_entries from anon, authenticated;
grant update (title, note, tags, visibility) on public.tierlists to authenticated;
grant update (label, color, position) on public.tiers to authenticated;
grant update (tier_id, position, note, child_tierlist_id) on public.tierlist_entries to authenticated;
revoke insert, delete on public.tierlists, public.tiers, public.tierlist_entries from anon;

create policy "tierlists_select" on public.tierlists for select
  using (owner_id = auth.uid() or visibility = 'public'
         or (visibility = 'friends' and public.are_friends(auth.uid(), owner_id)));
create policy "tierlists_insert" on public.tierlists for insert to authenticated
  with check (owner_id = auth.uid());
create policy "tierlists_update" on public.tierlists for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "tierlists_delete" on public.tierlists for delete to authenticated
  using (owner_id = auth.uid());

create policy "tiers_select" on public.tiers for select
  using (public.can_view_tierlist(tierlist_id));
create policy "tiers_insert" on public.tiers for insert to authenticated
  with check (public.owns_tierlist(tierlist_id));
create policy "tiers_update" on public.tiers for update to authenticated
  using (public.owns_tierlist(tierlist_id)) with check (public.owns_tierlist(tierlist_id));
create policy "tiers_delete" on public.tiers for delete to authenticated
  using (public.owns_tierlist(tierlist_id));

create policy "entries_select" on public.tierlist_entries for select
  using (public.can_view_tierlist(tierlist_id));
create policy "entries_insert" on public.tierlist_entries for insert to authenticated
  with check (public.owns_tierlist(tierlist_id));
create policy "entries_update" on public.tierlist_entries for update to authenticated
  using (public.owns_tierlist(tierlist_id)) with check (public.owns_tierlist(tierlist_id));
create policy "entries_delete" on public.tierlist_entries for delete to authenticated
  using (public.owns_tierlist(tierlist_id));

------------------------------------------------------------------
-- 5. RPC-функции
------------------------------------------------------------------
create or replace function public.insert_default_tiers(p_list uuid)
returns void language sql as $$
  insert into public.tiers (tierlist_id, label, color, position) values
    (p_list, 'S', '#ff7f7f', 0), (p_list, 'A', '#ffbf7f', 1), (p_list, 'B', '#ffff7f', 2),
    (p_list, 'C', '#7fff7f', 3), (p_list, 'D', '#7fbfff', 4), (p_list, 'E', '#7f7fff', 5);
$$;

create or replace function public.create_tierlist(p_title text, p_note text default null, p_tags text[] default '{}')
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.tierlists (owner_id, title, note, tags)
  values (auth.uid(), btrim(p_title), nullif(btrim(coalesce(p_note, '')), ''), coalesce(p_tags, '{}'))
  returning id into v_id;
  perform public.insert_default_tiers(v_id);
  return v_id;
end; $$;

-- Создаёт вложенный тир-лист для записи (название берётся из элемента) и привязывает его
create or replace function public.create_child_tierlist(p_entry uuid)
returns uuid language plpgsql as $$
declare
  v_title text;
  v_existing uuid;
  v_id uuid;
  v_updated int;
begin
  select i.title, e.child_tierlist_id into v_title, v_existing
  from public.tierlist_entries e join public.items i on i.id = e.item_id
  where e.id = p_entry;
  if not found then raise exception 'Запись не найдена'; end if;
  if v_existing is not null then raise exception 'У этой записи уже есть вложенный тир-лист'; end if;

  insert into public.tierlists (owner_id, title) values (auth.uid(), v_title) returning id into v_id;
  perform public.insert_default_tiers(v_id);
  update public.tierlist_entries set child_tierlist_id = v_id where id = p_entry;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'Нет прав на эту запись'; end if;
  return v_id;
end; $$;

-- Перемещает запись в тир (null = банк) на позицию p_index и перенумеровывает соседей
create or replace function public.move_entry(p_entry uuid, p_tier uuid, p_index int)
returns void language plpgsql as $$
declare
  v_list uuid;
  v_old uuid;
  v_count int;
  v_idx int;
begin
  select tierlist_id, tier_id into v_list, v_old from public.tierlist_entries where id = p_entry;
  if not found then raise exception 'Запись не найдена'; end if;
  if not public.owns_tierlist(v_list) then raise exception 'Нет прав на этот тир-лист'; end if;
  if p_tier is not null and not exists (select 1 from public.tiers where id = p_tier and tierlist_id = v_list) then
    raise exception 'Тир не принадлежит этому тир-листу';
  end if;

  select count(*) into v_count from public.tierlist_entries
  where tierlist_id = v_list and tier_id is not distinct from p_tier and id <> p_entry;
  v_idx := least(greatest(coalesce(p_index, 0), 0), v_count);

  -- освобождаем место под вставку
  with others as (
    select id, row_number() over (order by position, created_at, id) - 1 as rn
    from public.tierlist_entries
    where tierlist_id = v_list and tier_id is not distinct from p_tier and id <> p_entry
  )
  update public.tierlist_entries e
  set position = case when o.rn >= v_idx then o.rn + 1 else o.rn end
  from others o where e.id = o.id;

  update public.tierlist_entries set tier_id = p_tier, position = v_idx where id = p_entry;

  -- закрываем «дырку» в старом тире
  if v_old is distinct from p_tier then
    with old_rows as (
      select id, row_number() over (order by position, created_at, id) - 1 as rn
      from public.tierlist_entries
      where tierlist_id = v_list and tier_id is not distinct from v_old
    )
    update public.tierlist_entries e set position = o.rn from old_rows o where e.id = o.id;
  end if;
end; $$;

-- Порядок тиров: передаётся массив id тиров сверху вниз
create or replace function public.reorder_tiers(p_list uuid, p_ids uuid[])
returns void language plpgsql as $$
begin
  if not public.owns_tierlist(p_list) then raise exception 'Нет прав на этот тир-лист'; end if;
  if coalesce(array_length(p_ids, 1), 0) <> (select count(*) from public.tiers where tierlist_id = p_list)
     or (select count(distinct u.id) from unnest(p_ids) as u(id)) <> array_length(p_ids, 1)
     or exists (select 1 from unnest(p_ids) as u(id)
                where not exists (select 1 from public.tiers t where t.id = u.id and t.tierlist_id = p_list)) then
    raise exception 'Некорректный список тиров';
  end if;
  update public.tiers t set position = o.ord - 1
  from unnest(p_ids) with ordinality as o(id, ord)
  where t.id = o.id;
end; $$;

-- Список тир-листов пользователя (то, что разрешено видеть текущему) + служебные счётчики
create or replace function public.list_tierlists(p_owner uuid)
returns table (
  id uuid, owner_id uuid, title text, note text, tags text[], visibility text,
  updated_at timestamptz, entries_count int, parent_list_id uuid
)
language sql stable as $$
  select t.id, t.owner_id, t.title, t.note, t.tags, t.visibility, t.updated_at,
         (select count(*) from public.tierlist_entries e where e.tierlist_id = t.id)::int,
         (select e.tierlist_id from public.tierlist_entries e where e.child_tierlist_id = t.id limit 1)
  from public.tierlists t
  where t.owner_id = p_owner
  order by t.updated_at desc;
$$;

-- Цепочка родителей (от корня к непосредственному родителю), только видимые текущему пользователю
create or replace function public.tierlist_ancestors(p_id uuid)
returns table (id uuid, title text, depth int)
language sql stable as $$
  with recursive up as (
    select t.id, t.title, 0 as depth from public.tierlists t where t.id = p_id
    union all
    select pt.id, pt.title, up.depth + 1
    from up
    join public.tierlist_entries e on e.child_tierlist_id = up.id
    join public.tierlists pt on pt.id = e.tierlist_id
    where up.depth < 20
  )
  select up.id, up.title, up.depth from up where up.id <> p_id order by up.depth desc;
$$;

------------------------------------------------------------------
-- 6. Элемент каталога «занят» и тогда, когда его использует в тир-листе кто-то кроме автора
------------------------------------------------------------------
create or replace function public.item_is_shared(p_item uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.preferences pr
    where pr.item_id = p_item
      and pr.user_id is distinct from (select i.created_by from public.items i where i.id = p_item)
  ) or exists (
    select 1 from public.tierlist_entries te
    join public.tierlists tl on tl.id = te.tierlist_id
    where te.item_id = p_item
      and tl.owner_id is distinct from (select i.created_by from public.items i where i.id = p_item)
  );
$$;
