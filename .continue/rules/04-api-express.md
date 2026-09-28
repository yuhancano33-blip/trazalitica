---
name: API Express
description: Estructura de rutas, cadena de middlewares y manejo de errores en la API.
globs: ['server/**/*.js', 'api/**/*.js', 'shared/**/*.js', 'tests/integration/**']
---

# API Express

Convenciones de rutas, errores y códigos HTTP: `AGENTS.md` §5. Plantilla completa: `.agents/skills/endpoint-express-zod/`.

## Estructura

```
server/routes/v1/<recurso>.routes.js   export default Router
shared/schemas/<recurso>.schema.js     esquemas Zod (.strict()), compartidos con el frontend
server/services/<recurso>.service.js   lógica pura, sin req/res
```

Los esquemas de `shared/schemas/` no importan nada de `server/` ni de `src/`: solo `zod`. La API los importa por ruta relativa; el frontend, con el alias `@shared`.

Registrar el router en `server/routes/v1/index.js`. Rutas del proyecto: `/projects/:projectId/<recurso>` (kebab-case, plural).

## Cadena de middlewares (en este orden)

```js
router.post(
  '/projects/:projectId/stakeholders',
  authenticate, // 401 NO_TOKEN / INVALID_TOKEN; crea req.user y req.supabase
  requireProjectRole(['lider_tecnico', 'analista_requisitos']), // 404 si no es miembro, 403 si el rol no alcanza
  validateBody(stakeholderSchema), // 400 VALIDATION_ERROR; deja req.body parseado
  crearStakeholder,
);
```

- `authenticate` y `requireProjectRole` siguen el código de la Spec 8. Los roles salen de la matriz de permisos de esa spec.
- `validateBody(schema)` responde 400. Si la validación depende de datos de la BD (p. ej. el tipo del requisito en la Spec 4), el handler responde 422 `BUSINESS_RULE_VIOLATION`.
- Rutas sin `:projectId` (`/requirements/:reqId`): un middleware carga el recurso con `req.supabase`, fija `req.params.projectId` y después se aplica `requireProjectRole`.

## Errores

- Lanza `new ApiError(status, code, message, details)` (`server/lib/api-error.js`) o pasa el error de Supabase por `fromSupabaseError()`. El `errorHandler` global da el formato.
- Mapeo de PostgreSQL: `23505` → 409 `CONFLICT`; `23503` → 422; `23514`/`23502` → 400; `42501` (RLS) → 403; `PGRST116` → 404; `P0409` → 409 `VERSION_CONFLICT`.
- Nunca devuelvas `error.message` de PostgreSQL ni trazas al cliente en 500.

## Reglas

- Handlers con `async` y errores propagados a `next(err)` (Express 5 lo hace automáticamente).
- Solo `req.supabase`; nada de clientes globales ni `service_role`.
- Cada endpoint nuevo: esquema Zod + prueba de integración + entrada OpenAPI.
