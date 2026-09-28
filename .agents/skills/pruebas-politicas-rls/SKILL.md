---
name: pruebas-politicas-rls
description: Probar las políticas RLS de una tabla con pgTAP, suplantando a usuarios de distintos proyectos y roles, para demostrar el aislamiento exigido por la Spec 7.
---

# Pruebas de políticas RLS (pgTAP)

## Cuándo usarla

- Después de crear o modificar una tabla o sus políticas (skill `supabase-migracion-rls`).
- Para verificar el criterio de aceptación de la Spec 7: un usuario del proyecto A no puede leer, crear, modificar ni borrar datos del proyecto B.

## Pasos

1. Crea `supabase/tests/<tabla>.test.sql`.
2. Dentro de una transacción (`begin ... rollback`), crea usuarios ficticios en `auth.users`, dos proyectos y las membresías con los roles relevantes.
3. Inserta datos de referencia como `postgres` (omite RLS) antes de cambiar de rol.
4. Para cada operación (`select`, `insert`, `update`, `delete`) prueba al menos: miembro con rol permitido, miembro sin rol permitido y no miembro.
5. `npm run test:rls` (ejecuta `supabase test db`).

## Plantilla — `supabase/tests/stakeholders.test.sql`

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Usuarios ficticios
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'lider.a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'cientifico.a@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'lider.b@example.test');

-- Proyectos y membresías (como postgres, sin RLS)
insert into projects (id, nombre, created_by) values
  ('10000000-0000-0000-0000-00000000000a', 'Proyecto A', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-00000000000b', 'Proyecto B', '00000000-0000-0000-0000-00000000000c');
insert into project_members (project_id, user_id, rol) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'lider_tecnico'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'cientifico_datos'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'lider_tecnico')
on conflict do nothing;

insert into stakeholders (project_id, nombre, rol_negocio, tipo, poder, legitimidad, urgencia, created_by)
values ('10000000-0000-0000-0000-00000000000b', 'Stakeholder B', 'Gerente', 'negocio', 4, 4, 4,
        '00000000-0000-0000-0000-00000000000c');

-- Suplantar al líder del proyecto A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is_empty(
  $$ select 1 from stakeholders where project_id = '10000000-0000-0000-0000-00000000000b' $$,
  'SELECT: un miembro de A no ve stakeholders de B');

select throws_ok(
  $$ insert into stakeholders (project_id, nombre, rol_negocio, tipo, poder, legitimidad, urgencia)
     values ('10000000-0000-0000-0000-00000000000b', 'Intruso', 'X', 'negocio', 1, 1, 1) $$,
  '42501', null, 'INSERT: un miembro de A no crea en B');

select lives_ok(
  $$ insert into stakeholders (project_id, nombre, rol_negocio, tipo, poder, legitimidad, urgencia)
     values ('10000000-0000-0000-0000-00000000000a', 'Ana', 'Gerente', 'negocio', 4, 4, 4) $$,
  'INSERT: el líder de A crea en A');

select results_eq(
  $$ with u as (update stakeholders set nombre = 'Hack'
       where project_id = '10000000-0000-0000-0000-00000000000b' returning 1)
     select count(*)::int from u $$,
  array[0], 'UPDATE: un miembro de A no modifica filas de B');

select results_eq(
  $$ with d as (delete from stakeholders
       where project_id = '10000000-0000-0000-0000-00000000000b' returning 1)
     select count(*)::int from d $$,
  array[0], 'DELETE: un miembro de A no borra filas de B');

-- Suplantar al científico de datos de A (miembro sin rol de escritura)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select isnt_empty(
  $$ select 1 from stakeholders where project_id = '10000000-0000-0000-0000-00000000000a' $$,
  'SELECT: el científico de A ve los stakeholders de A');

select throws_ok(
  $$ insert into stakeholders (project_id, nombre, rol_negocio, tipo, poder, legitimidad, urgencia)
     values ('10000000-0000-0000-0000-00000000000a', 'Otro', 'X', 'negocio', 2, 2, 2) $$,
  '42501', null, 'INSERT: el científico no gestiona stakeholders (matriz Spec 8)');

-- Sin sesión
set local role anon;
select is_empty($$ select 1 from stakeholders $$, 'SELECT: anon no ve nada');

select * from finish();
rollback;
```

Notas:

- Un `update`/`delete` bloqueado por RLS no lanza error: afecta 0 filas. Por eso se cuentan las filas.
- Un `insert` bloqueado por `with check` lanza `42501`.
- Para la prueba equivalente desde la API (JS), inicia sesión con `supabase.auth.signInWithPassword` para cada usuario ficticio y repite las operaciones con su cliente.

## Checklist final

- [ ] Todo corre dentro de `begin ... rollback`; no quedan datos.
- [ ] Usuarios con correo `@example.test` y UUID fijos legibles.
- [ ] Cubiertas las cuatro operaciones para no miembro.
- [ ] Cubierto un miembro sin el rol requerido para cada operación restringida.
- [ ] Cubierto `anon`.
- [ ] `plan(n)` coincide con el número de aserciones; `npm run test:rls` pasa.
