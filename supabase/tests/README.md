# Проверка миграций и RLS на локальном PostgreSQL

Нужен PostgreSQL 15+ (у владельца проекта его нет — это для ИИ-ботов с доступом к терминалу).

```bash
createdb t
cat supabase/tests/harness.sql supabase/migrations/*.sql > /tmp/all.sql
psql -v ON_ERROR_STOP=1 -q -d t -f /tmp/all.sql
psql -q -d t -f supabase/tests/rls_scenarios.sql
```

Читайте вывод: под каждой строкой `== ... (ожид: ...)` должно быть ожидаемое. Любая миграция, меняющая права/RLS,
должна сопровождаться новым сценарием в этой папке.
