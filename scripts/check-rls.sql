-- Verificación de RLS para CI (Spec 7).
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/check-rls.sql
--
-- Falla si:
--   * alguna tabla de public no tiene RLS habilitado;
--   * alguna vista de public no usa security_invoker.
-- Avisa (sin fallar) si una tabla con RLS no tiene política para alguna operación:
-- puede ser intencional (p. ej. change_log es de solo inserción por trigger).

do $$
declare
  v_sin_rls   text;
  v_vistas    text;
  r           record;
begin
  select string_agg(tablename, ', ' order by tablename) into v_sin_rls
  from pg_tables
  where schemaname = 'public' and not rowsecurity;

  if v_sin_rls is not null then
    raise exception 'Tablas de public sin RLS: %', v_sin_rls;
  end if;

  select string_agg(c.relname, ', ' order by c.relname) into v_vistas
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'
    and not coalesce(c.reloptions @> array['security_invoker=on']
                  or c.reloptions @> array['security_invoker=true'], false);

  if v_vistas is not null then
    raise exception 'Vistas de public sin security_invoker: %', v_vistas;
  end if;

  for r in
    select t.tablename, op.cmd
    from pg_tables t
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as op(cmd)
    where t.schemaname = 'public'
      and not exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = t.tablename
          and (p.cmd = op.cmd or p.cmd = 'ALL'))
    order by t.tablename, op.cmd
  loop
    raise warning 'Tabla % sin política para %: confirmar que es intencional', r.tablename, r.cmd;
  end loop;

  raise notice 'check-rls: todas las tablas de public tienen RLS habilitado';
end $$;
