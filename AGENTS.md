# AGENTS.md — Fuente única de verdad para agentes de IA

Este archivo manda sobre cualquier otra instrucción para agentes (`.claude/`, `.continue/rules/`, `.agents/skills/`). Esos archivos amplían temas concretos; si alguno contradice lo que dice aquí, se corrige ese archivo, no este.

## 1. El proyecto

Plataforma web de soporte al **Marco de trabajo para la gestión de requisitos en proyectos de análisis de datos** (specs v2.0, `docs/specs/`). La herramienta debe ser una instancia fiel del marco, no un sistema paralelo: cada tabla, endpoint y vista existe porque el marco exige un artefacto o un dato.

El marco tiene cuatro fases secuenciales pero iterativas (un gate rechazado puede devolver el proyecto a una fase anterior):

| Fase                         | Enum `fase_marco` | Artefactos que produce                                                                                             | Specs |
| ---------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| 1. Elicitación               | `elicitacion`     | Acta de elicitación, VOC, ficha de caso de negocio, mapa de stakeholders (saliencia: poder, legitimidad, urgencia) | 1     |
| 2. Análisis y Priorización   | `analisis`        | Clasificación por tipo, matriz Kano, informe de viabilidad temprana, diagrama DAPS                                 | 2, 3  |
| 3. Especificación            | `especificacion`  | Ficha de especificación, árbol CTQ, matriz CTQ-KPI, backlog priorizado                                             | 4     |
| 4. Validación y Trazabilidad | `validacion`      | Matriz de trazabilidad, `change_log` inmutable, gates y acta de validación                                         | 5, 6  |

Specs transversales: **0** (núcleo de datos), **7** (RLS e infraestructura), **8** (autenticación y RBAC), **9** (métricas del estudio de caso).

Orden de implementación: 0 → 8 → 7 → 5 (solo `change_log` y triggers) → 1 → 2 y 3 → 4 → 5 (matriz) y 6 → 9. Lee siempre `docs/specs/00-convenciones-transversales.md` y la spec concreta antes de tocar código de un módulo.

## 2. Stack

| Capa               | Tecnología                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BD y autenticación | Supabase: PostgreSQL 15+, Supabase Auth, Row Level Security                                                                                                                             |
| API                | Node.js 20 LTS + Express, Zod; funciones serverless en Vercel (`api/index.js` → `server/app.js`)                                                                                        |
| Frontend           | Vue 3 (Composition API, `<script setup>`), Vite, Pinia, vue-router, Tailwind CSS                                                                                                        |
| Librerías por spec | `@vue-flow/core` (Spec 3), `ag-grid-vue3` Community (Spec 5), `vue-echarts` (Specs 1, 2, 9), `@asteasolutions/zod-to-openapi` (OpenAPI) — se instalan en la rama de la spec que las usa |
| Pruebas            | Vitest (unit e integración), Supertest, pgTAP (`supabase test db`), Playwright (e2e)                                                                                                    |
| Despliegue         | Vercel (frontend + API); cabeceras de seguridad en `vercel.json`                                                                                                                        |

## 3. Estructura del repositorio

```
api/index.js              Entrada serverless de Vercel (solo reexporta server/app.js)
server/                   API Express
  app.js                  Monta middlewares globales y /api/v1
  routes/v1/              Un archivo por recurso: <recurso>.routes.js
  services/               Lógica de negocio pura (testeable sin HTTP)
  middlewares/            authenticate, requireProjectRole, validateBody, errorHandler
  lib/                    ApiError, utilidades transversales
shared/schemas/           Esquemas Zod <recurso>.schema.js, usados por la API y el frontend (alias @shared)
src/                      Frontend Vue
  components/<fase>/      nucleo, elicitacion, analisis, especificacion, validacion, metricas, auth, comun
  views/  stores/  router/  lib/
supabase/                 config.toml, migrations/, seed.sql, tests/ (pgTAP)
tests/                    unit/, integration/, e2e/
scripts/                  gen-types.sh, check-rls.sql, seed-dev.js, check-supabase.js
docs/                     specs/, adr/, prompts/ (reglas-comunes.md: instrucciones para implementar cada spec)
```

## 4. Comandos

| Tarea                                                         | Comando                                          |
| ------------------------------------------------------------- | ------------------------------------------------ |
| Instalar                                                      | `npm ci`                                         |
| Levantar Supabase local (requiere Docker)                     | `npm run db:start`                               |
| Frontend en desarrollo (Vite, :5173)                          | `npm run dev`                                    |
| API en desarrollo (Express, :3000; Vite hace proxy de `/api`) | `npm run dev:api`                                |
| Nueva migración                                               | `npm run db:migration -- <nombre_en_snake_case>` |
| Aplicar migraciones desde cero + `seed.sql`                   | `npm run db:reset`                               |
| Datos ficticios de desarrollo                                 | `npm run seed:dev`                               |
| Regenerar tipos de Supabase                                   | `npm run db:types`                               |
| Lint / formato                                                | `npm run lint` / `npm run format`                |
| Pruebas unitarias                                             | `npm run test:unit`                              |
| Pruebas de integración (API contra Supabase local)            | `npm run test:integration`                       |
| Pruebas de políticas RLS (pgTAP)                              | `npm run test:rls`                               |
| Verificar que toda tabla de `public` tiene RLS                | `npm run check:rls`                              |
| Verificar la conexión con Supabase (no imprime llaves)        | `npm run check:supabase`                         |
| Pruebas e2e                                                   | `npm run test:e2e`                               |
| Auditoría de dependencias                                     | `npm run audit`                                  |

## 5. Convenciones

### Base de datos

- Nombres de tablas y columnas en `snake_case`. Conceptos del marco en español (`necesidad_expresada`, `clase_saliencia`); términos técnicos estándar en inglés (`created_at`, `project_id`).
- Llave primaria `id uuid primary key default gen_random_uuid()`. Excepciones: tablas de unión con llave compuesta y `change_log` (`bigint generated always as identity`).
- Toda tabla de negocio tiene `project_id`, `created_by`, `created_at` y `updated_at`. Las tablas hijas (nodos DAPS, respuestas Kano…) también llevan `project_id` para simplificar RLS. Si el SQL de una spec omite alguna de estas columnas, se agrega en la migración: la convención prevalece sobre el ejemplo.
- `updated_at` se mantiene con el trigger `set_updated_at()`; `created_by` por defecto es `auth.uid()`.
- Todo cambio de esquema va en una migración versionada (`supabase/migrations/`). Nunca cambios manuales en el panel de producción. Una migración aplicada no se edita: se crea otra.

### API REST

- Prefijo `/api/v1`. Recursos del proyecto anidados: `/api/v1/projects/:projectId/<recurso>`. Rutas de recurso sin `:projectId` (p. ej. `/requirements/:reqId`) resuelven primero el `project_id` del recurso.
- Formato de error único:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Texto legible", "details": [] } }
  ```
- Códigos HTTP:

| Código | Cuándo                                                                                                                                                          | `code` típico                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 400    | Entrada mal formada o que no cumple el esquema Zod                                                                                                              | `VALIDATION_ERROR`                                  |
| 401    | Sin token o token inválido                                                                                                                                      | `NO_TOKEN`, `INVALID_TOKEN`                         |
| 403    | Miembro del proyecto sin el rol requerido                                                                                                                       | `FORBIDDEN`                                         |
| 404    | Recurso inexistente **o no visible** para el usuario (un no miembro recibe 404, nunca 403, para no revelar que existe)                                          | `NOT_FOUND`, `PROJECT_NOT_FOUND`                    |
| 409    | Conflicto de estado o versión: duplicado, versión optimista, gate no aprobado                                                                                   | `CONFLICT`, `VERSION_CONFLICT`, `GATE_NOT_APPROVED` |
| 422    | Regla de negocio no cumplida (depende del estado de la BD: objetivo de otro proyecto, campos obligatorios según el tipo leído de la BD, transición inexistente) | `BUSINESS_RULE_VIOLATION`                           |
| 429    | Límite de peticiones                                                                                                                                            | `RATE_LIMITED`                                      |

- Documentación OpenAPI 3.1 generada desde los esquemas Zod.

### Frontend

- Solo `<script setup>` con Composition API. Estado compartido en Pinia; el servidor es la fuente de verdad.
- Componentes en la carpeta de su fase (`src/components/<fase>/`), nombres en PascalCase.
- Los guards de vue-router son experiencia de usuario, no seguridad: la autorización la hacen la API y RLS.

## 6. Git

- Ramas desde `main`: `feature/<kebab-case>`, `fix/<kebab-case>`, `chore/<kebab-case>`. Cada spec tiene su rama definida en su encabezado; úsala.
- Commits con Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `ci:`. Mensaje en español, en imperativo.
- Nada llega a `main` sin pull request, al menos una revisión y CI en verde (lint, unitarias, integración, RLS, `npm audit`).
- No se versionan `.env*` (salvo `*.example`), dumps `.sql`, carpetas `temp/` ni scripts de un solo uso.

## 7. Reglas de seguridad obligatorias

Estas reglas no se negocian ni se posponen "para después". Un PR que incumpla una se rechaza.

1. **RLS en toda tabla nueva.** `alter table ... enable row level security` en la misma migración que el `create table`, con políticas explícitas para `SELECT`, `INSERT`, `UPDATE` y `DELETE` basadas en `is_project_member(project_id, roles)`. Si una operación no debe permitirse (p. ej. escribir en `change_log`), se documenta con un comentario en la migración en lugar de la política. Las vistas se crean `with (security_invoker = on)`.
2. **Roles por proyecto en `project_members.rol`**, nunca en `user_metadata` (el usuario puede modificarlo). Un rol global, si llega a existir, va en `app_metadata` o en un Custom Access Token Hook.
3. **La llave `service_role` nunca llega al frontend** ni se declara con prefijo `VITE_` (Vite la incluiría en el bundle). Solo se usa en `scripts/` y en tareas administrativas puntuales del servidor, jamás para atender peticiones de usuario.
4. **Un cliente de Supabase por petición con el JWT del usuario**: el middleware `authenticate` crea el cliente con la llave anónima y `global.headers.Authorization = 'Bearer <token>'`, y lo deja en `req.supabase`. Así RLS se aplica y `auth.uid()` identifica al autor en el `change_log`.
5. **Prohibido `v-html` con contenido de usuario** (regla ESLint `vue/no-v-html` en `error`). La defensa contra XSS es la codificación en la salida de Vue; los campos de texto plano además rechazan `<` y `>` en Zod.
6. **Validación en dos capas**: Zod en la API (esquemas `.strict()`) y `check` / `not null` / llaves foráneas en la BD. La base de datos es la última línea de defensa: toda regla crítica de rango o formato existe en ambas.
7. Registro con pino sin tokens ni datos personales; `cors` con lista explícita de orígenes (sin `*`); `helmet()`; límite de cuerpo `1mb`; rate limit con almacén compartido (Redis), nunca en memoria.
8. Datos de desarrollo y pruebas siempre ficticios (dominio `example.test`). Nunca datos reales del estudio de caso en el repositorio.

## 8. Definición de Terminado (DoD)

Una spec (o una parte de ella) está terminada solo si:

- [ ] Las migraciones se aplican desde cero con `npm run db:reset` sin errores.
- [ ] Toda tabla nueva tiene RLS y políticas probadas con pgTAP (`supabase/tests/`) para miembro con rol, miembro sin rol y no miembro; `npm run check:rls` pasa.
- [ ] La lógica de negocio tiene pruebas unitarias (`tests/unit`).
- [ ] Cada endpoint tiene pruebas de integración (`tests/integration`) de caso feliz, 400, 401, 403/404 y la regla de negocio principal.
- [ ] Cada criterio de aceptación de la spec está verificado por una prueba o, si no es automatizable, documentado en el PR.
- [ ] La documentación OpenAPI está actualizada.
- [ ] CI en verde y PR revisado.
