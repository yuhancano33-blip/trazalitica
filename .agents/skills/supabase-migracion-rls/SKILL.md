---
name: supabase-migracion-rls
description: Crear una migración de Supabase con tablas que cumplen las convenciones del proyecto, RLS habilitado y políticas para SELECT, INSERT, UPDATE y DELETE por rol de proyecto.
---

# Migración de Supabase con RLS

## Cuándo usarla

- Vas a crear o modificar tablas, tipos, vistas o funciones en `public`.
- Implementas el modelo de datos de cualquier spec (0 a 9).
- No la uses para cargar datos: eso va en `supabase/seed.sql` o `scripts/seed-dev.js`.

## Pasos

1. Lee el bloque "Modelo de datos" de la spec y la matriz de permisos de la Spec 8.
2. Revisa `supabase/migrations/` para no duplicar tipos (`create type`) ni funciones.
3. `npm run db:migration -- <spec>_<nombre>` (p. ej. `spec01_stakeholders`).
4. Si es la **primera migración del proyecto (Spec 0)**, incluye antes que nada las funciones auxiliares (bloque A).
5. Por cada tabla, aplica la plantilla (bloque B). Ajusta los roles de cada política a la matriz de permisos.
6. Si la tabla debe auditarse (Spec 5), añade el trigger de la skill `trigger-auditoria`.
7. Escribe la prueba pgTAP (skill `pruebas-politicas-rls`).
8. `npm run db:reset && npm run check:rls && npm run test:rls && npm run db:types`.

## Plantilla

### A. Funciones auxiliares (una sola vez, en la migración de la Spec 0)

```sql
-- Mantiene updated_at en cada UPDATE
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Verificación de membresía centralizada (Spec 7).
-- security definer evita la recursión de RLS al consultar project_members desde sus propias políticas.
create or replace function public.is_project_member(p_project uuid, p_roles rol_proyecto[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from project_members m
    where m.project_id = p_project
      and m.user_id = (select auth.uid())
      and (p_roles is null or m.rol = any(p_roles)));
$$;

revoke execute on function public.is_project_member(uuid, rol_proyecto[]) from anon;
```

### B. Tabla de negocio

```sql
-- Spec N: <artefacto del marco que respalda esta tabla>
create table public.mi_tabla (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  nombre      varchar(150) not null check (char_length(trim(nombre)) > 0),
  -- ... columnas de la spec, con check para rangos (p. ej. between 1 and 5)
  created_by  uuid not null default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_mi_tabla_project on public.mi_tabla(project_id);

create trigger trg_mi_tabla_updated_at before update on public.mi_tabla
  for each row execute function public.set_updated_at();

alter table public.mi_tabla enable row level security;

create policy "mi_tabla_select_miembros" on public.mi_tabla
  for select to authenticated
  using (public.is_project_member(project_id));

create policy "mi_tabla_insert_editores" on public.mi_tabla
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_project_member(project_id,
      array['lider_tecnico','analista_requisitos']::rol_proyecto[]));

create policy "mi_tabla_update_editores" on public.mi_tabla
  for update to authenticated
  using (public.is_project_member(project_id,
    array['lider_tecnico','analista_requisitos']::rol_proyecto[]))
  with check (public.is_project_member(project_id,
    array['lider_tecnico','analista_requisitos']::rol_proyecto[]));

create policy "mi_tabla_delete_lider" on public.mi_tabla
  for delete to authenticated
  using (public.is_project_member(project_id, array['lider_tecnico']::rol_proyecto[]));
```

### C. Casos especiales

- **Vista:** `create view public.v_x with (security_invoker = on) as ...`.
- **Tabla de unión sin `project_id`** (p. ej. `session_participants`): agrega `project_id` si es posible; si no, la política verifica la membresía a través del padre con `exists (select 1 from padre p where p.id = padre_id and is_project_member(p.project_id))`.
- **`projects`:** las políticas usan `id` en lugar de `project_id`; el `insert` se permite a cualquier `authenticated` con `created_by = auth.uid()`, y un trigger agrega al creador como `lider_tecnico` en `project_members`.
- **Operación prohibida:** no crees la política y deja un comentario `-- sin política de DELETE: <motivo>`; `check-rls.sql` lo reportará como aviso, no como error.

## Checklist final

- [ ] `id uuid` con `gen_random_uuid()`; `project_id`, `created_by`, `created_at`, `updated_at` presentes (o desviación justificada).
- [ ] Todo rango o regla crítica de la spec tiene `check` / `not null` / FK.
- [ ] Índice en `project_id` y en cada FK que se filtre.
- [ ] Trigger `set_updated_at`.
- [ ] RLS habilitado y cuatro políticas `to authenticated` con los roles de la matriz de la Spec 8.
- [ ] `update` con `using` y `with check`; `insert` exige `created_by = auth.uid()`.
- [ ] Vistas con `security_invoker`; funciones `security definer` con `search_path` fijo.
- [ ] Prueba pgTAP creada; `db:reset`, `check:rls` y `test:rls` pasan.
- [ ] Tipos regenerados.
