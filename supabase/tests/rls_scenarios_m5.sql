-- Сценарии M5: тир-листы, вложенность, перемещение, права. Запускать на ЧИСТОЙ БД после всех миграций.
\set QUIET on
\pset format unaligned
\pset tuples_only on
\set as_a 'reset role; set role authenticated; set request.jwt.claim.sub to ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'';'
\set as_b 'reset role; set role authenticated; set request.jwt.claim.sub to ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'';'
\set as_c 'reset role; set role authenticated; set request.jwt.claim.sub to ''cccccccc-cccc-cccc-cccc-cccccccccccc'';'
\set as_anon 'reset role; set role anon; set request.jwt.claim.sub to '''';'
reset role;
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','b'),('cccccccc-cccc-cccc-cccc-cccccccccccc','c');
update public.profiles set username='alice' where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update public.profiles set username='bob'   where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
update public.profiles set username='carol' where id='cccccccc-cccc-cccc-cccc-cccccccccccc';

:as_a
insert into public.items (category_id, title, created_by) values (1,'Item1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i1 \gset
insert into public.items (category_id, title, created_by) values (1,'Item2','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i2 \gset
insert into public.items (category_id, title, created_by) values (1,'Item3','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i3 \gset
insert into public.items (category_id, title, created_by) values (1,'Item4','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i4 \gset
insert into public.items (category_id, title, created_by) values (1,'Item5','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i5 \gset

\echo == 1. create_tierlist: 6 тиров S..E по порядку (ожид: S,A,B,C,D,E)
select public.create_tierlist('Games', 'моя заметка', array['rpg','fav']) as l1 \gset
select string_agg(label, ',' order by position) from public.tiers where tierlist_id = :'l1';
\echo == 1b. list_tierlists(alice) (ожид: Games|6... entries 0, parent пусто)
select title||'|'||entries_count||'|'||coalesce(parent_list_id::text,'') from public.list_tierlists('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
\echo == 1c. Валидация: пустое название, заметка >300, плохой цвет (ожид: 3 ОШИБКИ)
select public.create_tierlist('   ');
select public.create_tierlist('x', repeat('a', 301));
insert into public.tiers (tierlist_id, label, color) values (:'l1', 'X', 'red');

\echo == 2. Записи в банк (ожид: 5)
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'l1', :'i1', 0) returning id as e1 \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'l1', :'i2', 1) returning id as e2 \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'l1', :'i3', 2) returning id as e3 \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'l1', :'i4', 3) returning id as e4 \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'l1', :'i5', 4) returning id as e5 \gset
select count(*) from public.tierlist_entries where tierlist_id = :'l1';
\echo == 2b. Тот же элемент второй раз в этот же лист (ожид: ОШИБКА unique)
insert into public.tierlist_entries (tierlist_id, item_id) values (:'l1', :'i1');

\echo == 3. Приватный лист: BOB ничего не видит и ничего не может
:as_b
select count(*) from public.tierlists where id = :'l1';
select count(*) from public.tiers where tierlist_id = :'l1';
select count(*) from public.tierlist_entries where tierlist_id = :'l1';
select count(*) from public.list_tierlists('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
\echo == 3b. BOB: вставка тира/записи/перемещение чужого (ожид: 3 ОШИБКИ)
insert into public.tiers (tierlist_id, label, color) values (:'l1', 'Z', '#000000');
insert into public.tierlist_entries (tierlist_id, item_id) values (:'l1', :'i1');
select public.move_entry(:'e1', null, 0);

\echo == 4. friends: ALICE ставит friends; BOB (не друг) 0; после дружбы 1/6/5; CAROL 0
:as_a
update public.tierlists set visibility='friends' where id = :'l1';
:as_b
select count(*) from public.tierlists where id = :'l1';
:as_a
insert into public.friendships (requester_id, addressee_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
:as_b
update public.friendships set status='accepted';
select (select count(*) from public.tierlists where id = :'l1') || '/' ||
       (select count(*) from public.tiers where tierlist_id = :'l1') || '/' ||
       (select count(*) from public.tierlist_entries where tierlist_id = :'l1');
:as_c
select count(*) from public.tierlists where id = :'l1';
\echo == 4b. public: ANON видит записи (ожид: 5); BOB всё равно не может менять (ожид: UPDATE 0)
:as_a
update public.tierlists set visibility='public' where id = :'l1';
:as_anon
select count(*) from public.tierlist_entries where tierlist_id = :'l1';
:as_b
update public.tierlist_entries set note='hack' where tierlist_id = :'l1';
update public.tierlists set title='hack' where id = :'l1';
:as_anon
insert into public.tierlists (owner_id, title) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','anon');

\echo == 5. Перемещения
:as_a
select id as ts from public.tiers where tierlist_id = :'l1' and label='S' \gset
select id as ta from public.tiers where tierlist_id = :'l1' and label='A' \gset
select public.move_entry(:'e1', :'ts', 0);
select public.move_entry(:'e2', :'ts', 1);
select public.move_entry(:'e3', :'ts', 2);
\echo == 5a. S: Item1,Item2,Item3 (ожид), банк: Item4,Item5
select string_agg(i.title, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tier_id = :'ts';
select string_agg(i.title||':'||e.position, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tierlist_id = :'l1' and e.tier_id is null;
\echo == 5b. Item3 на позицию 0 в том же тире (ожид: Item3:0,Item1:1,Item2:2)
select public.move_entry(:'e3', :'ts', 0);
select string_agg(i.title||':'||e.position, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tier_id = :'ts';
\echo == 5c. Item2 в тир A: S закрывает дырку (Item3:0,Item1:1), A: Item2:0
select public.move_entry(:'e2', :'ta', 0);
select string_agg(i.title||':'||e.position, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tier_id = :'ts';
select string_agg(i.title||':'||e.position, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tier_id = :'ta';
\echo == 5d. Item1 в банк на 0 (ожид: Item1:0,Item4:1,Item5:2), S: Item3:0
select public.move_entry(:'e1', null, 0);
select string_agg(i.title||':'||e.position, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tierlist_id = :'l1' and e.tier_id is null;
select string_agg(i.title||':'||e.position, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tier_id = :'ts';
\echo == 5e. Индекс за пределами: Item4 в S с индексом 99 (ожид: Item3:0,Item4:1), банк закрыт: Item1:0,Item5:1
select public.move_entry(:'e4', :'ts', 99);
select string_agg(i.title||':'||e.position, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tier_id = :'ts';
select string_agg(i.title||':'||e.position, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tierlist_id = :'l1' and e.tier_id is null;

\echo == 6. Тир из чужого листа: move_entry (ожид: ОШИБКА), прямой UPDATE tier_id (ожид: ОШИБКА fk)
select public.create_tierlist('Other') as l2 \gset
select id as tx from public.tiers where tierlist_id = :'l2' limit 1 \gset
select public.move_entry(:'e1', :'tx', 0);
update public.tierlist_entries set tier_id = :'tx' where id = :'e1';
\echo == 6b. Нельзя менять tierlist_id/item_id записи и owner_id листа (ожид: 3 ОШИБКИ permission denied)
update public.tierlist_entries set tierlist_id = :'l2' where id = :'e1';
update public.tierlist_entries set item_id = :'i2' where id = :'e1';
update public.tierlists set owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = :'l1';

\echo == 7. reorder_tiers
select string_agg(id::text, ',' order by position) as order_ids from public.tiers where tierlist_id = :'l1' \gset
select string_agg(label, ',' order by position) from public.tiers where tierlist_id = :'l1';
select public.reorder_tiers(:'l1', (select array_agg(id order by position desc) from public.tiers where tierlist_id = :'l1'));
\echo == 7a. После разворота (ожид: E,D,C,B,A,S)
select string_agg(label, ',' order by position) from public.tiers where tierlist_id = :'l1';
\echo == 7b. Неполный список / дубликаты / чужой BOB (ожид: 3 ОШИБКИ)
select public.reorder_tiers(:'l1', array[:'ts'::uuid]);
select public.reorder_tiers(:'l1', (select array_agg(:'ts'::uuid) from generate_series(1,6)));
:as_b
select public.reorder_tiers(:'l1', (select array_agg(id) from public.tiers where tierlist_id = :'l1'));

\echo == 8. Удаление тира S: записи остаются в листе и уходят в банк (ожид: tier_id null, кол-во 5)
:as_a
delete from public.tiers where id = :'ts';
select count(*) from public.tierlist_entries where tierlist_id = :'l1';
select count(*) from public.tierlist_entries where tierlist_id = :'l1' and tier_id is null;
\echo == 8b. Порядок банка: прежние Item1:0,Item5:1, затем перешедшие из S: Item3:2,Item4:3 (ожид)
select string_agg(i.title||':'||e.position, ',' order by e.position) from public.tierlist_entries e join public.items i on i.id=e.item_id where e.tierlist_id = :'l1' and e.tier_id is null;

\echo == 9. Вложенность
select public.create_child_tierlist(:'e1') as c1 \gset
select (child_tierlist_id = :'c1') from public.tierlist_entries where id = :'e1';
\echo == 9a. Название вложенного = название элемента (ожид: Item1), у него 6 тиров
select title from public.tierlists where id = :'c1';
select count(*) from public.tiers where tierlist_id = :'c1';
\echo == 9b. Повторное создание (ожид: ОШИБКА уже есть)
select public.create_child_tierlist(:'e1');
\echo == 9c. Родитель в list_tierlists (ожид: parent = l1)
select (parent_list_id = :'l1') from public.list_tierlists('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where id = :'c1';
\echo == 9d. Цикл: в C1 запись, ссылающаяся на L1 (ожид: ОШИБКА цикл)
insert into public.tierlist_entries (tierlist_id, item_id) values (:'c1', :'i1') returning id as ex \gset
update public.tierlist_entries set child_tierlist_id = :'l1' where id = :'ex';
\echo == 9e. Сам на себя (ожид: ОШИБКА цикл)
update public.tierlist_entries set child_tierlist_id = :'c1' where id = :'ex';
\echo == 9f. Тот же вложенный лист у второй записи (ожид: ОШИБКА unique)
update public.tierlist_entries set child_tierlist_id = :'c1' where id = :'e2';
\echo == 9g. Лист другого владельца как вложенный (ожид: ОШИБКА)
:as_b
select public.create_tierlist('Bobs') as bl \gset
:as_a
update public.tierlist_entries set child_tierlist_id = :'bl' where id = :'e2';
\echo == 9h. Внук и цепочка предков: ancestors(C2) = Games, Item1 (ожид)
select public.create_child_tierlist(:'ex') as c2 \gset
select string_agg(title, ',' order by depth desc) from public.tierlist_ancestors(:'c2');
\echo == 9i. Чужой не может создать вложенный в чужой записи, и лишний лист не остаётся (ожид: ОШИБКА, у BOB по-прежнему 1 лист)
:as_b
select public.create_child_tierlist(:'e3');
select count(*) from public.tierlists where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 9j. Хлебные крошки видны BOB (list public) — для C1 (приватный) предки не видны (ожид: 0 строк для C2 из-за приватности цепочки)
select count(*) from public.tierlist_ancestors(:'c2');

\echo == 10. Удаление C1: ссылка у e1 обнуляется (ожид: t), C2 остаётся и становится корнем
:as_a
delete from public.tierlists where id = :'c1';
select child_tierlist_id is null from public.tierlist_entries where id = :'e1';
select count(*) from public.tierlists where id = :'c2';
select parent_list_id is null from public.list_tierlists('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') where id = :'c2';

\echo == 11. Лимит тиров: в L1 осталось 5, добавляем до 20 и 21-й падает (ожид: ОШИБКА лимит)
do $$
begin
  for i in 1..15 loop
    insert into public.tiers (tierlist_id, label, color) select id, 'T'||i, '#123456' from public.tierlists where title = 'Games';
  end loop;
end $$;
insert into public.tiers (tierlist_id, label, color) select id, 'overflow', '#123456' from public.tierlists where title = 'Games';
select count(*) from public.tiers t join public.tierlists l on l.id = t.tierlist_id where l.title = 'Games';

\echo == 12. Элемент Alice в чужом тир-листе блокирует его правку (ожид: до: 1, после: 0)
update public.items set subtitle = 'edited' where id = :'i5';
select count(*) from public.items where id = :'i5' and subtitle = 'edited';
:as_b
select public.create_tierlist('BobList') as bl2 \gset
insert into public.tierlist_entries (tierlist_id, item_id) values (:'bl2', :'i5');
:as_a
update public.items set subtitle = 'edited2' where id = :'i5';
select count(*) from public.items where id = :'i5' and subtitle = 'edited2';

\echo == 13. Каскад: удаление BOB убирает его листы (ожид: 0)
reset role;
delete from auth.users where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select count(*) from public.tierlists where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
