-- Semilla mínima que se aplica con `npm run db:reset` (supabase db reset).
--
-- Reglas:
--   * Solo datos de catálogo o de referencia necesarios para que el esquema funcione.
--   * Nunca datos reales del estudio de caso ni datos personales.
--   * Los usuarios y proyectos ficticios de desarrollo los crea `npm run seed:dev`
--     (scripts/seed-dev.js), porque Supabase Auth debe generar las credenciales.
--
-- Por ahora no hay tablas: las migraciones se crean spec por spec.
select 1;
