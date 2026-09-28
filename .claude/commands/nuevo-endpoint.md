---
description: Crea una ruta Express con esquema Zod, prueba de integración y entrada OpenAPI
argument-hint: <MÉTODO> <ruta bajo /api/v1> [spec N]
---

Crea el endpoint: $ARGUMENTS

Sigue la skill `.agents/skills/endpoint-express-zod/SKILL.md` y las reglas de `.continue/rules/04-api-express.md`.

1. Localiza el endpoint en la tabla "Backend" de la spec (`docs/specs/`): método, ruta, rol permitido y descripción. Si no está en la spec, detente y pregunta.
2. Esquema Zod en `server/schemas/<recurso>.schema.js`: `.strict()`, longitudes máximas, texto plano sin `<` ni `>`, rangos iguales a los `check` de la BD.
3. Lógica de negocio en `server/services/<recurso>.service.js` como funciones puras, con pruebas unitarias en `tests/unit/`.
4. Ruta en `server/routes/v1/<recurso>.routes.js` con la cadena `authenticate → requireProjectRole([...]) → validateBody(schema) → handler`, usando solo `req.supabase`. Regístrala en `server/routes/v1/index.js`.
5. Errores con `ApiError` / `fromSupabaseError`; códigos HTTP según `AGENTS.md` §5 (no miembro → 404; rol insuficiente → 403; regla de negocio → 422; conflicto → 409).
6. Prueba de integración en `tests/integration/<recurso>.test.js`: caso feliz, 400, 401 sin token, 404 para no miembro, 403 para rol insuficiente y cada criterio de aceptación de la spec que aplique.
7. Registra el esquema y la ruta en la documentación OpenAPI.
8. Ejecuta `npm run lint`, `npm run test:unit` y `npm run test:integration` y reporta el resultado.
