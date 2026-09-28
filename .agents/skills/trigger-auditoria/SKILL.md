---
name: trigger-auditoria
description: Registrar los cambios de una tabla en el change_log inmutable con encadenamiento por hash (patrón de la Spec 5).
---

# Trigger de auditoría (`change_log`, Spec 5)

## Cuándo usarla

- La tabla guarda un artefacto que debe tener historia auditable: `requirements`, `requirement_specs` y las que indique cada spec (p. ej. `business_cases`, `stakeholders`).
- Vas a crear por primera vez `change_log` (orden de implementación: justo después de las Specs 0, 8 y 7).

## Pasos

1. Si `change_log` no existe, crea en una migración la tabla, `audit_changes()`, el bloqueo de modificación y sus permisos (bloque A).
2. Para cada tabla auditada, agrega el trigger (bloque B) en la migración que crea la tabla o en una nueva.
3. Comprueba que la tabla tiene `id uuid` y `project_id`: `audit_changes()` los necesita. Para tablas con llave compuesta, adapta `registro_id` (ver notas).
4. Prueba con pgTAP: una edición genera exactamente un registro con `changed_by` no nulo, y `authenticated` no puede modificar ni borrar el log.
5. `npm run db:reset && npm run check:rls && npm run test:rls`.

## Plantilla

### A. Infraestructura (una sola vez)

```sql
create table public.change_log (
  id             bigint generated always as identity primary key,
  project_id     uuid not null,
  tabla          text not null,
  registro_id    uuid not null,
  operacion      text not null check (operacion in ('INSERT','UPDATE','DELETE')),
  valor_anterior jsonb,
  valor_nuevo    jsonb,
  changed_by     uuid,
  changed_at     timestamptz not null default now(),
  hash_anterior  text,
  hash           text not null
);
create index idx_change_log_registro on public.change_log(project_id, tabla, registro_id);

create or replace function public.audit_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := coalesce(auth.uid(),
                  nullif(current_setting('app.current_user_id', true), '')::uuid);
  v_old  jsonb := case when TG_OP <> 'INSERT' then to_jsonb(old) end;
  v_new  jsonb := case when TG_OP <> 'DELETE' then to_jsonb(new) end;
  v_row  jsonb := coalesce(v_new, v_old);
  v_prev text;
begin
  -- Serializa la cadena: sin este bloqueo, dos transacciones concurrentes leen el mismo
  -- hash previo y la cadena se bifurca.
  perform pg_advisory_xact_lock(hashtext('change_log'));
  select hash into v_prev from change_log order by id desc limit 1;

  insert into change_log (project_id, tabla, registro_id, operacion,
                          valor_anterior, valor_nuevo, changed_by, hash_anterior, hash)
  values ((v_row->>'project_id')::uuid, TG_TABLE_NAME, (v_row->>'id')::uuid, TG_OP,
          v_old, v_new, v_user, v_prev,
          encode(sha256(convert_to(coalesce(v_prev,'') || coalesce(v_old::text,'')
                 || coalesce(v_new::text,'') || now()::text, 'UTF8')), 'hex'));
  return coalesce(new, old);
end $$;

create or replace function public.bloquear_modificacion() returns trigger
language plpgsql as $$ begin raise exception 'change_log es de solo inserción'; end $$;

create trigger trg_change_log_inmutable before update or delete on public.change_log
  for each row execute function public.bloquear_modificacion();

revoke update, delete, truncate on public.change_log from anon, authenticated;

alter table public.change_log enable row level security;
create policy "log_select_miembros" on public.change_log for select to authenticated
  using (public.is_project_member(project_id));
-- Sin políticas de INSERT, UPDATE ni DELETE: solo escribe audit_changes() (security definer).
```

### B. Por cada tabla auditada

```sql
create trigger trg_audit_requirements
  after insert or update or delete on public.requirements
  for each row execute function public.audit_changes();
```

## Notas

- `auth.uid()` solo tiene valor si la petición llega con el JWT del usuario. Por eso la API usa `req.supabase` y nunca `service_role`; si `changed_by` queda nulo en una operación desde la API, es un defecto.
- `app.current_user_id` es solo respaldo para procesos internos dentro de una función RPC (`set_config('app.current_user_id', ..., true)`).
- Tablas con llave compuesta (p. ej. `requirement_artifacts`): no tienen `id`, así que `registro_id` sería nulo y el insert fallaría. Usa la llave principal del padre (`requirement_id`) mediante una variante de la función o agrega una columna `id`.
- La verificación de integridad (`GET /change-log/verify`) recalcula la cadena en orden de `id` y compara cada `hash`.

## Checklist final

- [ ] La tabla auditada tiene `id` y `project_id` (o la variante documentada).
- [ ] Trigger `after insert or update or delete ... for each row`.
- [ ] Un UPDATE desde la API genera exactamente un registro con `changed_by` = usuario.
- [ ] `authenticated` recibe error al intentar `update`/`delete` sobre `change_log`.
- [ ] `change_log` tiene RLS y solo política de `select`.
- [ ] Bloqueo `pg_advisory_xact_lock` presente para que la cadena de hash no se bifurque.
- [ ] Pruebas pgTAP del registro y de la inmutabilidad en verde.
