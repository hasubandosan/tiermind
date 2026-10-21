-- Сценарии M6: группы сравнения. Запускать на ЧИСТОЙ БД после всех миграций.
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
-- дружба: A-B и A-D (C ни с кем не дружит)
insert into public.friendships (requester_id, addressee_id, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','accepted'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','dddddddd-dddd-dddd-dddd-dddddddddddd','accepted');
-- каталог и данные
insert into public.items (category_id, title, created_by) values (1,'Item1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i1 \gset
insert into public.items (category_id, title, created_by) values (1,'Item2','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i2 \gset
insert into public.items (category_id, title, created_by) values (1,'Item3','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') returning id as i3 \gset
insert into public.test_results (user_id, test_slug, test_version, answers, scores, visibility, taken_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ocean-tipi',1,'{}','{"scoring":"scales","percents":{"O":80}}','private', now() - interval '1 day'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','ocean-tipi',1,'{}','{"scoring":"scales","percents":{"O":10}}','private', now() - interval '2 day'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','ocean-tipi',1,'{}','{"scoring":"scales","percents":{"O":60}}','private', now() - interval '1 hour');
insert into public.preferences (user_id, item_id, rating) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'i1', 2), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'i2', -1), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'i3', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', :'i1', 1), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', :'i2', -2);

:as_b
select public.create_tierlist('BobList') as lb \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'lb', :'i1', 0) returning id as eb1 \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'lb', :'i2', 1) returning id as eb2 \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'lb', :'i3', 2) returning id as eb3 \gset
select id as b_s from public.tiers where tierlist_id = :'lb' and label = 'S' \gset
select id as b_e from public.tiers where tierlist_id = :'lb' and label = 'E' \gset
select public.move_entry(:'eb1', :'b_s', 0);
select public.move_entry(:'eb2', :'b_e', 0);
:as_a
select public.create_tierlist('AliceList') as la \gset
insert into public.tierlist_entries (tierlist_id, item_id, position) values (:'la', :'i1', 0) returning id as ea1 \gset
select id as a_s from public.tiers where tierlist_id = :'la' and label = 'S' \gset
select public.move_entry(:'ea1', :'a_s', 0);

\echo == 1. A создаёт группу (ожид: 1 строка joined, 1 участник)
select public.create_group('Trio') as g \gset
select my_status||'|'||member_count||'|'||owner_username from public.my_groups();
\echo == 1b. Пустое название / слишком длинное (ожид: 2 ОШИБКИ)
select public.create_group('   ');
select public.create_group(repeat('x', 61));

\echo == 2. Приглашения: C не друг (ожид: ОШИБКА), B (ок), B повторно (ОШИБКА), D (ок)
select public.invite_to_group(:'g', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
select public.invite_to_group(:'g', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select public.invite_to_group(:'g', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select public.invite_to_group(:'g', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
\echo == 2b. B (приглашён) не может приглашать (ожид: ОШИБКА)
:as_b
select public.invite_to_group(:'g', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

\echo == 3. B-приглашённый: видит приглашение (invited|1|alice), группу (1), своё членство (1), но не участников/данные (0/0/0/0)
select my_status||'|'||member_count||'|'||owner_username from public.my_groups();
select count(*) from public.groups where id = :'g';
select count(*) from public.group_members where group_id = :'g';
select count(*) from public.group_members_view(:'g');
select count(*) from public.group_tests(:'g');
select count(*) from public.group_preferences(:'g');
select count(*) from public.group_tier_scores(:'g');
\echo == 3b. Прямые записи в таблицы групп (ожид: 3 ОШИБКИ permission denied)
insert into public.group_members (group_id, user_id, status) values (:'g', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'joined');
update public.group_members set status = 'joined' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
insert into public.group_tierlists (group_id, tierlist_id, user_id) values (:'g', :'lb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
\echo == 3c. Приглашённый не может прикрепить тир-лист (ожид: ОШИБКА)
select public.set_group_tierlist(:'g', :'lb', true);

\echo == 4. C (посторонний): групп 0, my_groups 0, ответ на несуществующее приглашение / прикрепление (ожид: 0, 0, 2 ОШИБКИ)
:as_c
select count(*) from public.groups where id = :'g';
select count(*) from public.my_groups();
select public.respond_group_invite(:'g', true, true, true);
select public.set_group_tierlist(:'g', :'lb', true);

\echo == 5. B принимает: тесты делится, предпочтениями нет
:as_b
select public.respond_group_invite(:'g', true, true, false);
\echo == 5a. B видит 3 участников: alice|joined|t|t, bob|joined|t|f, dave|invited|f|f
select username||'|'||status||'|'||share_tests||'|'||share_preferences from public.group_members_view(:'g');

\echo == 6. Тесты группы: A и B (по одному, последний у B = 60), при этом прямой доступ A к результатам B закрыт
:as_a
select count(*) from public.group_tests(:'g');
select string_agg(u.username||'='||(t.scores->'percents'->>'O'), ',' order by u.username) from public.group_tests(:'g') t join public.profiles u on u.id = t.user_id;
\echo == 6a. Прямой select чужих результатов (ожид: 0)
select count(*) from public.test_results where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 6b. B выключает share_tests: A видит только свои (ожид: 1); потом включает (ожид: 2)
:as_b
select public.update_group_sharing(:'g', false, false);
:as_a
select count(*) from public.group_tests(:'g');
:as_b
select public.update_group_sharing(:'g', true, false);
:as_a
select count(*) from public.group_tests(:'g');

\echo == 7. Предпочтения: у B share=false => только A (ожид: 3); B включает => 5; прямой доступ к предпочтениям B закрыт (ожид: 0)
select count(*) from public.group_preferences(:'g');
:as_b
select public.update_group_sharing(:'g', true, true);
:as_a
select count(*) from public.group_preferences(:'g');
select count(*) from public.preferences where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 7a. D (только приглашён) не видит ничего (ожид: 0)
:as_d
select count(*) from public.group_preferences(:'g');

\echo == 8. Тир-листы: B прикрепляет свой (ок), чужой (ОШИБКА); A прикрепляет свой
:as_b
select public.set_group_tierlist(:'g', :'lb', true);
select public.set_group_tierlist(:'g', :'la', true);
:as_a
select public.set_group_tierlist(:'g', :'la', true);
\echo == 8a. Очки: B: Item1=1 (тир S), Item2=0 (тир E), Item3 в банке не учитывается; A: Item1=1  (ожид строки)
select u.username||':'||s.title||'='||s.tier_score||'('||s.tier_label||')' from public.group_tier_scores(:'g') s join public.profiles u on u.id = s.user_id order by 1;
\echo == 8b. Прямой доступ A к приватному тир-листу B (ожид: 0), к записям (ожид: 0)
select count(*) from public.tierlists where id = :'lb';
select count(*) from public.tierlist_entries where tierlist_id = :'lb';
\echo == 8c. Повторное прикрепление не дублирует (ожид: 1 строка у A)
select public.set_group_tierlist(:'g', :'la', true);
select count(*) from public.group_tierlists where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
\echo == 8d. D (не участник) прикрепить не может, смотреть данные не может (ожид: ОШИБКА, 0)
:as_d
select public.create_tierlist('DaveList') as ld \gset
select public.set_group_tierlist(:'g', :'ld', true);
select count(*) from public.group_tier_scores(:'g');

\echo == 9. ANON: таблицы закрыты, функции пусты (ожид: ОШИБКА, 0)
:as_anon
select count(*) from public.groups;
select count(*) from public.group_tests(:'g');

\echo == 10. Управление: B не может удалять D (ОШИБКА); A не может удалить себя (ОШИБКА) и выйти (ОШИБКА)
:as_b
select public.remove_group_member(:'g', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
:as_a
select public.remove_group_member(:'g', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select public.leave_group(:'g');
\echo == 10b. Переименование: A ок; B молча не может (A видит имя Trio2)
update public.groups set name = 'Trio2' where id = :'g';
:as_b
update public.groups set name = 'Hacked' where id = :'g';
delete from public.groups where id = :'g';
:as_a
select name from public.groups where id = :'g';
\echo == 10c. B не может менять owner_id (ожид: ОШИБКА permission denied)
:as_b
update public.groups set owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = :'g';

\echo == 11. A удаляет B из группы: данные B исчезают из сравнения, прикреплённые листы откреплены, B больше не видит группу
:as_a
select public.remove_group_member(:'g', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select (select count(*) from public.group_tests(:'g')) || '/' || (select count(*) from public.group_preferences(:'g')) || '/' || (select count(*) from public.group_tier_scores(:'g'));
reset role;
select count(*) from public.group_tierlists where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
:as_b
select count(*) from public.groups where id = :'g';

\echo == 12. D принимает и выходит; повторный выход (ОШИБКА); переприглашение; отказ удаляет приглашение
:as_d
select public.respond_group_invite(:'g', true, false, false);
select public.leave_group(:'g');
select public.leave_group(:'g');
:as_a
select public.invite_to_group(:'g', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
:as_d
select public.respond_group_invite(:'g', false);
select count(*) from public.group_members where group_id = :'g' and user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
\echo == 12b. Ответ на приглашение, когда его нет / update_group_sharing не участником (ожид: 2 ОШИБКИ)
select public.respond_group_invite(:'g', true);
select public.update_group_sharing(:'g', true, true);

\echo == 13. Лимит участников: группа на 12 человек (A + 11), 12-й приглашённый — ОШИБКА
reset role;
insert into auth.users (id, email) select gen_random_uuid(), 'u'||lpad(n::text, 2, '0') from generate_series(1,12) n;
insert into public.friendships (requester_id, addressee_id, status)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', u.id, 'accepted' from auth.users u where u.email like 'u%';
-- вызываем функции от имени A (роль суперпользователя, но auth.uid() = A): так проще перебрать пользователей
set request.jwt.claim.sub to 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select public.create_group('Big') as g2 \gset
do $$
declare r record; n int := 0;
begin
  for r in select id from auth.users where email like 'u%' order by email loop
    n := n + 1;
    exit when n > 11;
    perform public.invite_to_group((select id from public.groups where name = 'Big'), r.id);
  end loop;
end $$;
select count(*) from public.group_members where group_id = :'g2';
select public.invite_to_group(:'g2', (select id from auth.users where email = 'u12'));

\echo == 14. Удаление группы владельцем каскадом чистит всё (ожид: 0/0/0)
:as_a
select public.set_group_tierlist(:'g', :'la', true);
delete from public.groups where id = :'g';
reset role;
select (select count(*) from public.groups where id = :'g') || '/' || (select count(*) from public.group_members where group_id = :'g') || '/' || (select count(*) from public.group_tierlists where group_id = :'g');
\echo == 15. Удаление пользователя убирает его членства (ожид: 0)
delete from auth.users where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
select count(*) from public.group_members where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
