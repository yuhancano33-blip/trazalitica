---
description: Crea una migración de Supabase con RLS y políticas para las cuatro operaciones
argument-hint: <nombre_snake_case> [spec N] [descripción de las tablas]
---

Crea una migración de Supabase para: $ARGUMENTS

Sigue la skill `.agents/skills/supabase-migracion-rls/SKILL.md` y las reglas de `AGENTS.md` §5 y §7.

1. Lee la spec indicada en `docs/specs/` y la matriz de permisos de `docs/specs/spec-08-autenticacion.md`.
2. Revisa las migraciones existentes en `supabase/migrations/` para no duplicar tipos, funciones ni tablas. Confirma que existen `is_project_member()` y `set_updated_at()`; si no existen y esta es la primera migración de la Spec 0, créalas.
3. Genera el archivo con `npm run db:migration -- <nombre>` (no inventes el timestamp).
4. Escribe en la misma migración, para cada tabla:
   - `create table` con `id`, `project_id`, `created_by`, `created_at`, `updated_at`, `check`/`not null` para las reglas de la spec;
   - índices en las FK;
   - trigger `set_updated_at`;
   - `enable row level security` + políticas `select`, `insert`, `update` (con `using` y `with check`) y `delete`, con los roles de la matriz;
   - trigger de auditoría si la spec lo pide (skill `trigger-auditoria`).
5. Crea la prueba pgTAP en `supabase/tests/<tabla>.test.sql` (skill `pruebas-politicas-rls`).
6. Ejecuta `npm run db:reset`, `npm run check:rls` y `npm run test:rls`, y regenera tipos con `npm run db:types`.
7. Resume: tablas creadas, políticas por rol y operación, y cualquier desviación respecto al SQL de la spec (con el motivo).
