-- Сценарии приватности/RLS (M3). Ожидаемые результаты указаны в строках cho ("ожид: ...").
\set QUIET on
\pset format unaligned
\pset tuples_only on
reset role;
insert into auth.users (id, email) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','b'),
 ('cccccccc-cccc-cccc-cccc-cccccccccccc','c'),
 ('dddddddd-dddd-dddd-dddd-dddddddddddd','d');
update public.profiles set username='alice', display_name='Alice A', bio='bio-alice', visibility='public'  where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update public.profiles set username='bob',   display_name='Bob B',   bio='bio-bob',   visibility='friends' where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
update public.profiles set username='carol', display_name='Carol C', bio='bio-carol', visibility='private' where id='cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.profiles set username='dave',  display_name='Dave D',  bio='bio-dave',  visibility='public'  where id='dddddddd-dddd-dddd-dddd-dddddddddddd';

\echo == 1. ANON: card alice (ожид: can_view=t, bio-alice)
set role anon; select set_config('request.jwt.claim.sub','',false);
select username, can_view, bio from public.profile_card('alice');
\echo == 1b. ANON: card bob (ожид: can_view=f, bio пусто)
select username, can_view, coalesce(bio,'<null>') from public.profile_card('bob');
\echo == 1c. ANON: card carol (ожид: 0 строк)
select count(*) from public.profile_card('carol');
\echo == 1d. ANON: search (ожид: 0)
select count(*) from public.search_profiles('al');
\echo == 1e. ANON: прямой select profiles (ожид: только alice,dave)
select string_agg(username, ',' order by username) from public.profiles;

\echo == 2. DAVE: прямой select profiles (ожид: alice,dave)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','dddddddd-dddd-dddd-dddd-dddddddddddd',false);
select string_agg(username, ',' order by username) from public.profiles;
\echo == 2b. DAVE: поиск 'bo' (ожид: bob), 'ca' (ожид: 0), 'a' (ожид: 0, слишком короткий), 'li' по display_name (ожид: alice)
select string_agg(username, ',') from public.search_profiles('bo');
select count(*) from public.search_profiles('ca');
select count(*) from public.search_profiles('a');
select string_agg(username, ',') from public.search_profiles('li');
\echo == 2c. DAVE: поиск спецсимволов "%" и "_" (ожид: 0, не должен матчить всё)
select count(*) from public.search_profiles('%%');
select count(*) from public.search_profiles('_l');

\echo == 3. DAVE шлёт заявку bob (ожид: INSERT 1)
insert into public.friendships (requester_id, addressee_id) values ('dddddddd-dddd-dddd-dddd-dddddddddddd','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
\echo == 3b. DAVE шлёт заявку от имени alice (ожид: ОШИБКА RLS)
insert into public.friendships (requester_id, addressee_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
\echo == 3c. DAVE шлёт заявку самому себе (ожид: ОШИБКА)
insert into public.friendships (requester_id, addressee_id) values ('dddddddd-dddd-dddd-dddd-dddddddddddd','dddddddd-dddd-dddd-dddd-dddddddddddd');
\echo == 3d. DAVE сам принимает свою заявку (ожид: UPDATE 0)
update public.friendships set status='accepted' where requester_id='dddddddd-dddd-dddd-dddd-dddddddddddd';
\echo == 3e. DAVE шлёт заявку сразу accepted (ожид: ОШИБКА RLS)
insert into public.friendships (requester_id, addressee_id, status) values ('dddddddd-dddd-dddd-dddd-dddddddddddd','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','accepted');
\echo == 3f. DAVE: card bob до дружбы (ожид: can_view=f)
select can_view, coalesce(bio,'<null>') from public.profile_card('bob');

\echo == 4. BOB видит входящую заявку (ожид: dave|pending|f)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
select username||'|'||status||'|'||i_am_requester from public.my_friendships();
\echo == 4b. BOB пытается подменить requester_id (ожид: ОШИБКА permission denied)
update public.friendships set requester_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
\echo == 4c. BOB встречная заявка dave (ожид: ОШИБКА unique)
insert into public.friendships (requester_id, addressee_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','dddddddd-dddd-dddd-dddd-dddddddddddd');
\echo == 4d. BOB принимает (ожид: UPDATE 1)
update public.friendships set status='accepted' where requester_id='dddddddd-dddd-dddd-dddd-dddddddddddd' and addressee_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo == 5. DAVE после дружбы: card bob (ожид: can_view=t, bio-bob), прямой select profiles (ожид: alice,bob,dave)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','dddddddd-dddd-dddd-dddd-dddddddddddd',false);
select can_view, bio from public.profile_card('bob');
select string_agg(username, ',' order by username) from public.profiles;

\echo == 6. Результаты: BOB сохраняет friends-результат и public-результат
reset role; set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
insert into public.test_results (user_id, test_slug, test_version, answers, scores, visibility) values
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','ocean-tipi',1,'{"x":1}','{"s":1}','friends'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','types-16',1,'{"x":1}','{"s":2}','public'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','enneagram',1,'{"x":1}','{"s":3}','private');
\echo == 6b. BOB INSERT ... RETURNING (как делает клиент) (ожид: 1 строка)
insert into public.test_results (user_id, test_slug, test_version, answers, scores) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','dark-triad',1,'{}','{}') returning id is not null;
\echo == 6c. BOB читает answers (ожид: ОШИБКА permission denied)
select answers from public.test_results limit 1;
\echo == 6d. BOB видит свои 4 результата
select count(*) from public.test_results;
\echo == 6e. DAVE (друг): видит friends+public = 2 (ожид: ocean-tipi,types-16)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','dddddddd-dddd-dddd-dddd-dddddddddddd',false);
select string_agg(test_slug, ',' order by test_slug) from public.test_results where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 6f. ALICE (не друг): только public (ожид: types-16)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select string_agg(test_slug, ',' order by test_slug) from public.test_results where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 6g. ANON: только public (ожид: types-16)
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select string_agg(test_slug, ',' order by test_slug) from public.test_results where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 6h. ALICE пытается вставить результат за BOB (ожид: ОШИБКА RLS)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
insert into public.test_results (user_id, test_slug, test_version, answers, scores) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','x',1,'{}','{}');
\echo == 6i. ALICE меняет чужую видимость (ожид: UPDATE 0)
update public.test_results set visibility='public' where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo == 7. ALICE не видит чужие связи (ожид: 0), удаление чужой связи (ожид: DELETE 0)
select count(*) from public.my_friendships();
delete from public.friendships;
\echo == 8. DAVE удаляет дружбу (ожид: DELETE 1) и теряет доступ к bob
reset role; set role authenticated; select set_config('request.jwt.claim.sub','dddddddd-dddd-dddd-dddd-dddddddddddd',false);
delete from public.friendships where addressee_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select can_view from public.profile_card('bob');
select string_agg(test_slug, ',') from public.test_results where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 9. Удаление пользователя каскадом (ожид: 0 профилей и результатов bob)
reset role;
delete from auth.users where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select (select count(*) from public.profiles where username='bob') || '/' || (select count(*) from public.test_results where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
