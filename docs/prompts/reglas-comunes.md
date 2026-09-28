# Reglas comunes para implementar cualquier spec

> Ubicación: `docs/prompts/reglas-comunes.md`. Cada prompt de spec le pide al agente leer este archivo.

## Antes de escribir código

1. Lee `AGENTS.md`, `docs/specs/00-convenciones-transversales.md` y el archivo de la spec indicada. Si la spec menciona otras specs, revisa también esas secciones.
2. Parte de `main` actualizado y trabaja únicamente en la rama indicada en el prompt.
3. Presenta primero un **plan** con:
   - archivos que vas a crear o modificar;
   - migraciones, en orden, con el nombre de cada una;
   - endpoints (método, ruta, rol permitido);
   - componentes y vistas de frontend;
   - pruebas que vas a escribir, una por cada criterio de aceptación;
   - dudas o contradicciones que encuentres entre la spec y el código existente.
4. **Espera mi aprobación del plan** antes de escribir código.

## Alcance

- Implementa solo lo que pide la spec. No agregues funcionalidades, librerías ni tablas que no estén en ella.
- Si algo no está claro o la spec contradice el código existente, pregúntame en lugar de suponer.
- No modifiques código de specs anteriores salvo que sea necesario; si lo haces, explica por qué.

## Base de datos (Supabase)

- Toda migración se crea con `npx supabase migration new <nombre_descriptivo>` en `supabase/migrations/`. Nunca modifiques la base desde el panel web.
- Toda tabla nueva lleva `project_id` (salvo que la spec indique lo contrario), RLS habilitado y políticas para SELECT, INSERT, UPDATE y DELETE usando `is_project_member`.
- Las vistas se crean con `security_invoker = on`.
- Reglas críticas en dos capas: `check` / `not null` / llaves foráneas en la base, y Zod en la API.
- **Antes de aplicar una migración** al proyecto de desarrollo con `npx supabase db push`, muéstrame el SQL completo y espera mi aprobación.
- Al terminar, regenera los tipos con `npm run db:types` si el script existe.

## API (Express)

- Rutas bajo `/api/v1`, con los middlewares `authenticate`, `requireProjectRole` y `validateBody` según corresponda.
- Esquemas Zod en `shared/schemas/`, reutilizables en el frontend.
- Formato de error: `{ "error": { "code", "message", "details" } }`.
- Códigos HTTP: 400 entrada mal formada, 401 sin sesión, 403 sin permiso por rol, 404 no existe o no es visible, 409 conflicto de estado o versión, 422 regla de negocio no cumplida.
- Usa el cliente de Supabase por petición con el JWT del usuario (`req.supabase`). Nunca uses la secret key (`SUPABASE_SERVICE_ROLE_KEY`) en la API de usuario.

## Frontend (Vue 3)

- Composition API con `<script setup>`, Pinia para estado, componentes en la carpeta de su fase (`src/components/<fase>/`).
- Prohibido `v-html` con contenido de usuario.
- Los guards de rutas mejoran la experiencia, pero la autorización real la hacen la API y RLS.

## Seguridad

- Nunca imprimas, copies ni escribas llaves en código, logs, pruebas o mensajes.
- No modifiques `.env`. Si necesitas una variable nueva, agrégala a `.env.example` sin valor y avísame.
- No hagas commit de archivos `.env`, dumps `.sql` fuera de `supabase/migrations/` ni archivos temporales.

## Pruebas

- Una prueba por cada criterio de aceptación de la spec, más pruebas unitarias de la lógica de negocio.
- Las pruebas de RLS deben autenticarse como usuarios de distintos proyectos y roles.
- Ejecuta **todas** las pruebas del proyecto, no solo las nuevas, para detectar regresiones.

## Al terminar

Entrégame un informe con:

1. Resumen de archivos creados y modificados.
2. Migraciones creadas y si fueron aplicadas.
3. Resultado completo de las pruebas.
4. Lista de criterios de aceptación de la spec: cumplido / no cumplido, con la prueba que lo verifica.
5. Decisiones que tomaste y pendientes.
6. Salida de `git status`.
7. Mensajes de commit propuestos (Conventional Commits).

Cambia el campo **Estado** de la spec a "En revisión". No hagas push hasta que yo lo apruebe.
