-- M2: результаты тестов
-- Метаданные и вопросы тестов лежат в apps/web/src/content/tests/*.json, в БД хранятся только результаты.

create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_slug text not null,
  test_version int not null,
  answers jsonb not null,
  scores jsonb not null,
  visibility text not null default 'private'
    check (visibility in ('public', 'friends', 'private')),
  taken_at timestamptz not null default now()
);

create index test_results_user_slug_idx
  on public.test_results (user_id, test_slug, taken_at desc);

alter table public.test_results enable row level security;

-- Видны свои результаты и результаты с visibility = 'public'.
-- Вариант 'friends' заработает вместе с системой друзей (M3).
-- Примечание: у публичного результата читается и поле answers; позже можно вынести в представление без него.
create policy "test_results_select" on public.test_results
  for select using (user_id = auth.uid() or visibility = 'public');

create policy "test_results_insert_own" on public.test_results
  for insert with check (user_id = auth.uid());

create policy "test_results_update_own" on public.test_results
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "test_results_delete_own" on public.test_results
  for delete using (user_id = auth.uid());
