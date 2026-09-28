-- Garantía global de la Spec 7: ninguna tabla del esquema public queda sin RLS
-- y toda vista respeta las políticas del usuario que consulta.
-- Las pruebas por tabla (<tabla>.test.sql) siguen la skill .agents/skills/pruebas-politicas-rls.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select is_empty(
  $$ select tablename from pg_tables
     where schemaname = 'public' and not rowsecurity $$,
  'Todas las tablas de public tienen RLS habilitado');

select is_empty(
  $$ select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v'
       and not coalesce(c.reloptions @> array['security_invoker=on']
                     or c.reloptions @> array['security_invoker=true'], false) $$,
  'Todas las vistas de public usan security_invoker');

select * from finish();
rollback;
