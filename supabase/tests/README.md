# Проверка миграций и RLS на локальном PostgreSQL

Нужен PostgreSQL 15+ (у владельца проекта его нет — это для ИИ-ботов с доступом к терминалу).

Каждый файл сценариев запускается на ЧИСТОЙ базе (они создают одних и тех же тестовых пользователей):

```bash
for f in rls_scenarios.sql rls_scenarios_m4.sql rls_scenarios_m5.sql rls_scenarios_m6.sql rls_scenarios_m7.sql; do
  dropdb --if-exists t; createdb t
  cat supabase/tests/harness.sql supabase/migrations/*.sql > /tmp/all.sql
  psql -v ON_ERROR_STOP=1 -q -d t -f /tmp/all.sql
  psql -q -d t -f supabase/tests/$f
done
```

Читайте вывод: под каждой строкой `== ... (ожид: ...)` должно быть ожидаемое. Строки `ERROR:` — это ожидаемые отказы
(там, где в ожиданиях написано «ОШИБКА»). Любая миграция, меняющая права/RLS, должна сопровождаться новым сценарием в этой папке.
