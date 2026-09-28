---
name: Base de datos y Supabase
description: Migraciones, RLS y triggers de auditoría en Supabase/PostgreSQL.
globs: ['supabase/**/*.sql', 'scripts/*.sql']
---

# Base de datos (Supabase)

Convenciones completas en `AGENTS.md` §5. Skills con plantillas: `.agents/skills/supabase-migracion-rls/`, `pruebas-politicas-rls/`, `trigger-auditoria/`.

## Migraciones

- Crear con `npm run db:migration -- <nombre_snake_case>`; nunca a mano ni desde el panel.
- Una migración por cambio lógico, con el número de spec en un comentario de cabecera.
- Una migración ya fusionada en `main` no se edita: se agrega otra.
- Verificar siempre con `npm run db:reset` (aplica todo desde cero).

## Tablas

- `id uuid primary key default gen_random_uuid()`.
- `project_id uuid not null references projects(id) on delete cascade`, `created_by uuid not null default auth.uid() references auth.users(id)`, `created_at` y `updated_at timestamptz not null default now()`.
- Trigger `set_updated_at()` en toda tabla con `updated_at`.
- Rangos y reglas críticas con `check` (p. ej. `poder between 1 and 5`), aunque Zod ya las valide.
- Índices en toda FK usada por políticas o filtros (`project_id`, `requirement_id`…).

## RLS

- `enable row level security` en la misma migración que crea la tabla.
- Cuatro políticas (`select`, `insert`, `update`, `delete`) `to authenticated`, usando `is_project_member(project_id, array[...]::rol_proyecto[])` según la matriz de permisos de la Spec 8.
- `update` lleva `using` **y** `with check` (impide mover una fila a otro proyecto).
- Vistas: `with (security_invoker = on)`.
- Funciones `security definer` solo si es imprescindible, siempre con `set search_path = public` (o vacío con nombres calificados).

## Auditoría (Spec 5)

- Tablas auditadas: `requirements`, `requirement_specs` y las que indique cada spec. Trigger `after insert or update or delete ... execute function audit_changes()`.
- `change_log` es de solo inserción: trigger de bloqueo + `revoke update, delete, truncate` + solo política de `select`.
- `auth.uid()` debe tener valor: por eso la API usa el JWT del usuario, no `service_role`.
