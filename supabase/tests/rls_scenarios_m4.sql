-- Сценарии M4: каталог, предпочтения, хранилище. Запускать на ЧИСТОЙ БД после всех миграций (см. README).
\set QUIET on
\pset format unaligned
\pset tuples_only on
reset role;
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','b'),('cccccccc-cccc-cccc-cccc-cccccccccccc','c');
update public.profiles set username='alice' where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update public.profiles set username='bob'   where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
update public.profiles set username='carol' where id='cccccccc-cccc-cccc-cccc-cccccccccccc';

\echo == 1. Категории: ANON видит 8 (ожид: 8); ANON не может менять категории (ожид: ОШИБКА)
set role anon;
select count(*) from public.categories;
insert into public.categories (slug,name,emoji) values ('x','x','x');

\echo == 2. ALICE создаёт элементы
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
insert into public.items (category_id, title, subtitle, image_url, created_by)
  select id, 'Geralt of Rivia', 'The Witcher', 'https://example.com/g.jpg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from public.categories where slug='characters';
insert into public.items (category_id, title, subtitle, created_by)
  select id, 'Bohemian Rhapsody', 'Queen', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from public.categories where slug='music';
insert into public.items (category_id, title, created_by)
  select id, '100%_test', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from public.categories where slug='food';
\echo == 2b. Дубликат в другом регистре (ожид: ОШИБКА unique)
insert into public.items (category_id, title, subtitle, created_by)
  select id, 'GERALT OF RIVIA', 'the witcher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from public.categories where slug='characters';
\echo == 2c. Тот же заголовок, другая вселенная — разрешено (ожид: INSERT)
insert into public.items (category_id, title, subtitle, created_by)
  select id, 'Geralt of Rivia', 'Fanfic', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from public.categories where slug='characters';
\echo == 2d. От чужого имени (ожид: ОШИБКА RLS)
insert into public.items (category_id, title, created_by)
  select id, 'Fake', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' from public.categories where slug='games';
\echo == 2e. http-картинка (ожид: ОШИБКА check)
insert into public.items (category_id, title, image_url, created_by)
  select id, 'Bad img', 'http://example.com/a.jpg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from public.categories where slug='games';
\echo == 2f. javascript: картинка (ожид: ОШИБКА check)
insert into public.items (category_id, title, image_url, created_by)
  select id, 'Bad img2', 'javascript:alert(1)', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from public.categories where slug='games';
\echo == 2g. Пустое название и название с пробелами по краям (ожид: 2 ОШИБКИ)
insert into public.items (category_id, title, created_by) select id, '', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from public.categories where slug='games';
insert into public.items (category_id, title, created_by) select id, ' Padded ', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' from public.categories where slug='games';
\echo == 2h. Несуществующая категория (ожид: ОШИБКА fk)
insert into public.items (category_id, title, created_by) values (999, 'x', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
\echo == 2i. Удалять элементы нельзя (ожид: ОШИБКА permission denied)
delete from public.items;

\echo == 3. Лимит 50 в сутки: создаём 46 ещё (всего 4 уже есть => 50), 51-й должен упасть (ожид: ОШИБКА лимит)
do $$
begin
  for i in 1..46 loop
    insert into public.items (category_id, title, created_by) values (1, 'Bulk '||i, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  end loop;
end $$;
insert into public.items (category_id, title, created_by) values (1, 'Bulk overflow', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select count(*) from public.items where created_by='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo == 4. ANON: каталог виден, my_rating пусто (ожид: Bohemian Rhapsody|Queen||)
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select title||'|'||coalesce(subtitle,'')||'|'||coalesce(my_rating::text,'') from public.browse_items('music', null);
\echo == 4b. Поиск по подписи Queen (ожид: 1), по "100%" (ожид: 1, не все), по "%" (ожид: 1: только с буквальным %), по "_" (ожид: 1)
select count(*) from public.browse_items(null, 'queen');
select count(*) from public.browse_items(null, '100%');
select count(*) from public.browse_items(null, '%');
select count(*) from public.browse_items(null, '_');
\echo == 4c. Точное совпадение названия идёт первым: ищем 'geralt of rivia' (ожид: первая строка подпись Fanfic или The Witcher, обе точные)
select count(*) from public.browse_items('characters', 'geralt of rivia');
\echo == 4d. Пагинация: лимит 5 offset 0 и offset 5 дают разные первые id (ожид: t)
select (select id from public.browse_items(null,null,5,0) limit 1) <> (select id from public.browse_items(null,null,5,5) limit 1);

\echo == 5. BOB оценивает
reset role; set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
insert into public.preferences (user_id, item_id, rating)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', id, 2 from public.items where title='Bohemian Rhapsody';
\echo == 5b. Оценка 3 (ожид: ОШИБКА check), оценка за другого (ожид: ОШИБКА RLS)
insert into public.preferences (user_id, item_id, rating) select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', id, 3 from public.items where title='Geralt of Rivia' and subtitle='The Witcher';
insert into public.preferences (user_id, item_id, rating) select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, 1 from public.items where title='Geralt of Rivia' and subtitle='The Witcher';
\echo == 5c. Upsert оценки: меняем 2 -> -1 (ожид: -1 в browse_items)
insert into public.preferences (user_id, item_id, rating)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', id, -1 from public.items where title='Bohemian Rhapsody'
  on conflict (user_id, item_id) do update set rating = excluded.rating;
select my_rating from public.browse_items('music', null);
\echo == 5d. BOB не может править чужой элемент (ожид: UPDATE 0)
update public.items set title='Hacked' where title='Bohemian Rhapsody';

\echo == 6. Автор правит свой элемент, пока он не оценён другими
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
update public.items set subtitle='Queen (1975)' where title='Geralt of Rivia' and subtitle='Fanfic';
select count(*) from public.items where subtitle='Queen (1975)';
\echo == 6b. Bohemian оценён Bob => Alice уже не может править (ожид: UPDATE 0 -> 0 строк с Queen 1975 на нём)
update public.items set subtitle='Queen (1975)' where title='Bohemian Rhapsody';
select count(*) from public.items where title='Bohemian Rhapsody' and subtitle='Queen (1975)';
\echo == 6c. Alice не может сменить автора (ожид: ОШИБКА RLS)
update public.items set created_by='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where title='100%_test';

\echo == 7. Приватность предпочтений: по умолчанию private
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
\echo == 7a. ALICE смотрит предпочтения BOB (ожид: 0)
select count(*) from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 7b. BOB ставит friends; ALICE пока не друг (ожид: 0)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
update public.profiles set preferences_visibility='friends' where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select count(*) from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 7c. Стали друзьями (ожид: 1)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
insert into public.friendships (requester_id, addressee_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
reset role; set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
update public.friendships set status='accepted';
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select count(*) from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 7d. CAROL (не друг) не видит (ожид: 0); ANON не видит (ожид: 0)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','cccccccc-cccc-cccc-cccc-cccccccccccc',false);
select count(*) from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select count(*) from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 7e. BOB ставит public; ANON видит (ожид: 1)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
update public.profiles set preferences_visibility='public' where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
reset role; set role anon;
select count(*) from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 7f. Встроенный запрос как в клиенте: предпочтения + элемент через join (ожид: 1 строка)
select count(*) from public.preferences p join public.items i on i.id = p.item_id where p.user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo == 7g. BOB может удалить свою оценку (ожид: DELETE 1), чужую — нет
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
delete from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select count(*) from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
reset role; set role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
delete from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select count(*) from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo == 8. Невалидное значение visibility (ожид: ОШИБКА check)
update public.profiles set preferences_visibility='everyone' where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo == 9. Хранилище: ALICE грузит в свою папку (ожид: INSERT), в папку BOB (ожид: ОШИБКА RLS), ANON (ожид: ОШИБКА)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
insert into storage.objects (bucket_id, name) values ('item-images', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/pic.jpg');
insert into storage.objects (bucket_id, name) values ('item-images', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/pic.jpg');
insert into storage.objects (bucket_id, name) values ('item-images', 'pic.jpg');
reset role; set role anon;
insert into storage.objects (bucket_id, name) values ('item-images', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/anon.jpg');
\echo == 9b. Бакет создан публичным с лимитом 512КБ (ожид: t|524288)
reset role;
select public||'|'||file_size_limit from storage.buckets where id='item-images';

\echo == 10. Каскады: удаление Bob удаляет его оценки; удаление Alice оставляет элементы с created_by=null
insert into public.preferences (user_id, item_id, rating) select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', id, 1 from public.items limit 3;
delete from auth.users where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select count(*) from public.preferences where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
delete from auth.users where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select ((select count(*) from public.items) > 0)::text || '|' || (select count(*) from public.items where created_by is not null);
