-- Сценарии M7: шаблоны тир-листов. Запускать на ЧИСТОЙ БД после всех миграций.
\set QUIET on
\pset format unaligned
\pset tuples_only on
\set as_a 'reset role; set role authenticated; set request.jwt.claim.sub to ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'';'
\set as_b 'reset role; set role authenticated; set request.jwt.claim.sub to ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'';'
\set as_c 'reset role; set role authenticated; set request.jwt.claim.sub to ''cccccccc-cccc-cccc-cccc-cccccccccccc'';'
\set as_d 'reset role; set role authenticated; set request.jwt.claim.sub to ''dddddddd-dddd-dddd-dddd-dddddddddddd'';'
\set as_anon 'reset role; set role anon; set request.jwt.claim.sub to '''';'
reset role;
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','b'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','c'),('dddddddd-dddd-dddd-dddd-dddddddddddd','d');
update public.profiles set username='alice' where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update public.profiles set username='bob'   where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
update public.profiles set username='carol' where id='cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.profiles set username='dave'  where id='dddddddd-dddd-dddd-dddd-dddddddddddd';
insert into public.friendships (requester_id, addressee_id, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','dddddddd-dddd-dddd-dddd-dddddddddddd','accepted');
insert into public.items (category_id, title, created_by) values (1,'Item1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i1 \gset
insert into public.items (category_id, title, created_by) values (1,'Item2','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i2 \gset
insert into public.items (category_id, title, created_by) values (1,'Item3','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i3 \gset
insert into public.items (category_id, title, created_by) values (1,'Item4','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i4 \gset
insert into public.items (category_id, title, created_by) values (1,'Item5','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i5 \gset

:as_a
select public.create_tierlist('Игры', 'описание шаблона', array['rpg']) as l \gset
insert into public.tierlist_entries (tierlist_id, item_id, position, note) values (:'l', :'i1', 0, 'секретная заметка автора') returning id as e1 \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'l', :'i2', 1) returning id as e2 \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'l', :'i3', 2) returning id as e3 \gset
select id as ts from public.tiers where tierlist_id = :'l' and label = 'S' \gset
select id as te from public.tiers where tierlist_id = :'l' and label = 'E' \gset
select public.move_entry(:'e1', :'ts', 0);
select public.move_entry(:'e2', :'te', 0);
select public.create_child_tierlist(:'e3') as cl \gset
insert into public.tierlist_entries (tierlist_id, item_id, position, note) values (:'cl', :'i4', 0, 'заметка во вложенном') returning id as ec1 \gset

\echo == 1. Флаг шаблона: A делает L шаблоном (приватным) — ок; B не может менять чужой список (ожид: 0 строк изменено)
update public.tierlists set is_template = true where id = :'l';
select is_template from public.tierlists where id = :'l';
:as_b
update public.tierlists set is_template = true where id = :'l';
\echo == 1a. Приватный шаблон B не виден в галерее (ожид: 0)
select count(*) from public.list_templates();
\echo == 1b. Вложенный список нельзя сделать шаблоном (ОШИБКА); шаблон нельзя вложить (ОШИБКА)
:as_a
update public.tierlists set is_template = true where id = :'cl';
select public.create_tierlist('Второй шаблон') as l2 \gset
update public.tierlists set is_template = true where id = :'l2';
insert into public.tierlist_entries (tierlist_id, item_id) values (:'l', :'i5') returning id as e5 \gset
update public.tierlist_entries set child_tierlist_id = :'l2' where id = :'e5';
delete from public.tierlist_entries where id = :'e5';

\echo == 2. Публичный шаблон: B, C, ANON видят в галерее (ожид: 1/1/1)
update public.tierlists set visibility = 'public' where id = :'l';
:as_b
select count(*) from public.list_templates();
:as_c
select count(*) from public.list_templates();
:as_anon
select count(*) from public.list_templates();
\echo == 2a. Вложенный (приватный) список виден через публичный шаблон: B видит CL и его записи (ожид: 1/1)
:as_b
select count(*) from public.tierlists where id = :'cl';
select count(*) from public.tierlist_entries where tierlist_id = :'cl';
\echo == 2b. Если снять флаг шаблона — вложенный снова скрыт (ожид: 0), потом вернуть (ожид: 1)
:as_a
update public.tierlists set is_template = false where id = :'l';
:as_b
select count(*) from public.tierlists where id = :'cl';
:as_a
update public.tierlists set is_template = true where id = :'l';
:as_b
select count(*) from public.tierlists where id = :'cl';
\echo == 2c. Обычный публичный список (не шаблон) не открывает вложенный приватный (ожид: 0)
:as_a
select public.create_tierlist('Обычный') as lp \gset
insert into public.tierlist_entries (tierlist_id, item_id) values (:'lp', :'i1') returning id as ep \gset
select public.create_child_tierlist(:'ep') as cp \gset
update public.tierlists set visibility = 'public' where id = :'lp';
:as_b
select count(*) from public.tierlists where id = :'cp';
\echo == 2d. friends-шаблон: C (не друг) 0, D (друг) 1 (ожид: 0/1), потом снова public
:as_a
update public.tierlists set visibility = 'friends' where id = :'l';
:as_c
select count(*) from public.list_templates();
:as_d
select count(*) from public.list_templates();
:as_a
update public.tierlists set visibility = 'public' where id = :'l';

\echo == 3. B проходит шаблон
:as_b
select public.start_from_template(:'l') as bl \gset
select (owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')||'|'||visibility||'|'||is_template||'|'||(source_template_id = :'l')||'|'||title from public.tierlists where id = :'bl';
\echo == 3a. Тиры скопированы (ожид: S,A,B,C,D,E), записей 3, все в банке (ожид: 3|3), позиции 0,1,2, заметка автора не скопирована (ожид: 0)
select string_agg(label, ',' order by position) from public.tiers where tierlist_id = :'bl';
select (select count(*) from public.tierlist_entries where tierlist_id = :'bl') || '|' || (select count(*) from public.tierlist_entries where tierlist_id = :'bl' and tier_id is null);
select string_agg(position::text, ',' order by position) from public.tierlist_entries where tierlist_id = :'bl';
select count(*) from public.tierlist_entries where tierlist_id = :'bl' and note is not null;
\echo == 3b. Вложенный скопирован: у B ровно 2 списка, у записи Item3 есть вложенный с одной записью Item4 (ожид: 2|1|Item4)
select (select count(*) from public.tierlists where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  || '|' || (select count(*) from public.tierlist_entries where tierlist_id = (select child_tierlist_id from public.tierlist_entries where tierlist_id = :'bl' and child_tierlist_id is not null))
  || '|' || (select i.title from public.tierlist_entries e join public.items i on i.id = e.item_id where e.tierlist_id = (select child_tierlist_id from public.tierlist_entries where tierlist_id = :'bl' and child_tierlist_id is not null));
\echo == 3c. Заметка из вложенного не скопирована (ожид: 0), источник вложенного = CL (ожид: t)
select count(*) from public.tierlist_entries where tierlist_id = (select child_tierlist_id from public.tierlist_entries where tierlist_id = :'bl' and child_tierlist_id is not null) and note is not null;
select (source_template_id = :'cl') from public.tierlists where id = (select child_tierlist_id from public.tierlist_entries where tierlist_id = :'bl' and child_tierlist_id is not null);
\echo == 3d. Копию B другие не видят (A, C: 0)
:as_a
select count(*) from public.tierlists where id = :'bl';
:as_c
select count(*) from public.tierlists where id = :'bl';
\echo == 3e. Нельзя пройти: не-шаблон / приватный шаблон / friends-шаблон не другом / аноним (ожид: 4 ОШИБКИ)
:as_b
select public.start_from_template(:'lp');
:as_a
update public.tierlists set is_template = true where id = :'l2';
:as_b
select public.start_from_template(:'l2');
:as_a
update public.tierlists set visibility = 'friends' where id = :'l';
:as_c
select public.start_from_template(:'l');
:as_anon
select public.start_from_template(:'l');
\echo == 3f. Друг D может пройти friends-шаблон; затем вернём public
:as_d
select public.start_from_template(:'l') as dl \gset
select count(*) from public.tierlists where id = :'dl';
:as_a
update public.tierlists set visibility = 'public' where id = :'l';

\echo == 4. Автор меняет шаблон — копия B не меняется (ожид: B копия по-прежнему 3, шаблон 4)
:as_a
insert into public.tierlist_entries (tierlist_id, item_id) values (:'l', :'i5');
select count(*) from public.tierlist_entries where tierlist_id = :'l';
:as_b
select count(*) from public.tierlist_entries where tierlist_id = :'bl';

\echo == 5. Результаты: B расставляет (Item1 в S, Item2 в E), копия приватна
:as_b
select e.id as be1 from public.tierlist_entries e where e.tierlist_id = :'bl' and e.item_id = :'i1' \gset
select e.id as be2 from public.tierlist_entries e where e.tierlist_id = :'bl' and e.item_id = :'i2' \gset
select id as bts from public.tiers where tierlist_id = :'bl' and label = 'S' \gset
select id as bte from public.tiers where tierlist_id = :'bl' and label = 'E' \gset
select public.move_entry(:'be1', :'bts', 0);
select public.move_entry(:'be2', :'bte', 0);
\echo == 5a. Для A: открытых прохождений 0, оценок 0, но счётчик прохождений в галерее (B и D) = 2
:as_a
select count(*) from public.template_passes(:'l');
select count(*) from public.template_scores(:'l');
select passes_count from public.list_templates(null, null, 'popular', 30, 0, :'l');
\echo == 5b. B открывает прохождение: A видит 1 прохождение (bob|2|4 из 4... расставлено 2, всего 3) и 2 оценки (Item1=1, Item2=0)
:as_b
update public.tierlists set visibility = 'public' where id = :'bl';
:as_a
select username||'|'||placed||'|'||total from public.template_passes(:'l');
select string_agg(i.title||'='||s.tier_score, ',' order by i.title) from public.template_scores(:'l') s join public.items i on i.id = s.item_id;
\echo == 5c. D открывает копию только друзьям: A (друг) видит 2 прохождения, C (не друг) только B (ожид: 2 / 1)
:as_d
select id as dts from public.tiers where tierlist_id = :'dl' and label = 'A' \gset
select e.id as de1 from public.tierlist_entries e where e.tierlist_id = :'dl' and e.item_id = :'i1' \gset
select public.move_entry(:'de1', :'dts', 0);
update public.tierlists set visibility = 'friends' where id = :'dl';
:as_a
select count(*) from public.template_passes(:'l');
:as_c
select count(*) from public.template_passes(:'l');
\echo == 5d. Берётся последнее прохождение человека: B начинает заново (новая копия), расставляет Item3 и открывает — у B в оценках только Item3
:as_b
select public.start_from_template(:'l') as bl2 \gset
select e.id as be3 from public.tierlist_entries e where e.tierlist_id = :'bl2' and e.item_id = :'i3' \gset
select id as bts2 from public.tiers where tierlist_id = :'bl2' and label = 'S' \gset
select public.move_entry(:'be3', :'bts2', 0);
update public.tierlists set visibility = 'public' where id = :'bl2';
select string_agg(i.title, ',') from public.template_scores(:'l') s join public.items i on i.id = s.item_id where s.user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 5e. my_pass_id у B = последняя копия (ожид: t)
select (my_pass_id = :'bl2') from public.list_templates(null, null, 'popular', 30, 0, :'l');
\echo == 5f. ANON видит открытые оценки (Bob: Item3) — публичные данные (ожид: 1 для Bob)
:as_anon
select count(*) from public.template_scores(:'l') where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo == 6. Поиск и сортировка галереи: по тегу rpg (1), по несуществующему (0), по названию «игр» (1), спецсимвол % (0)
:as_b
select count(*) from public.list_templates(null, 'rpg');
select count(*) from public.list_templates(null, 'nope');
select count(*) from public.list_templates('игр');
select count(*) from public.list_templates('%');

\echo == 7. Лимит шаблонов 50: сначала 48 успешно (всего 50), затем 51-й — ОШИБКА
:as_a
do $$
declare i int; v uuid;
begin
  for i in 1..48 loop
    v := public.create_tierlist('T' || i);
    update public.tierlists set is_template = true where id = v;
  end loop;
end $$;
select count(*) from public.tierlists where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and is_template;
select public.create_tierlist('T51') as t51 \gset
update public.tierlists set is_template = true where id = :'t51';
select count(*) from public.tierlists where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and is_template;

\echo == 8. Удаление шаблона: копии остаются, источник обнуляется (ожид: t|0 в галерее)
select public.create_tierlist('Лишний') as lx \gset
update public.tierlists set is_template = false where id = :'l2';
delete from public.tierlists where id = :'l';
:as_b
select (source_template_id is null) from public.tierlists where id = :'bl';
select count(*) from public.list_templates(null, 'rpg');

\echo == 9. Глубина: цепочка из 7 вложенных, прохождение копирует корень + 5 уровней = 6 списков
reset role;
insert into public.items (category_id, title, created_by) select 1, 'Z'||n, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from generate_series(1,8) n;
:as_a
select public.create_tierlist('Цепь') as ch0 \gset
update public.tierlists set is_template = true where id = :'ch0';
update public.tierlists set visibility = 'public' where id = :'ch0';
do $$
declare cur uuid := (select id from public.tierlists where title = 'Цепь'); e uuid; nxt uuid; i int;
begin
  for i in 1..7 loop
    insert into public.tierlist_entries (tierlist_id, item_id) values (cur, (select id from public.items where title = 'Z' || i)) returning id into e;
    nxt := public.create_child_tierlist(e);
    cur := nxt;
  end loop;
end $$;
:as_c
select public.start_from_template((select id from public.tierlists where title = 'Цепь' and is_template)) as chc \gset
select count(*) from public.tierlists where owner_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
