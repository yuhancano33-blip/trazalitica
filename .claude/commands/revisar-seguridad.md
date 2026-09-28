---
description: Revisa la rama actual contra el checklist de seguridad de las Specs 7 y 8
argument-hint: [rama o ruta a revisar]
---

Revisa la seguridad de: $ARGUMENTS

Si no se indicó nada, revisa los cambios de la rama actual respecto a `main`.

Usa `git diff main...HEAD` para acotar la revisión, pero comprueba también el estado global cuando el punto lo requiera. Para cada ítem responde **Cumple / No cumple / No aplica**, con archivo y línea como evidencia. No corrijas nada sin antes presentar el informe.

## Spec 7 — RLS e infraestructura

- [ ] Toda tabla creada en `supabase/migrations/` tiene `enable row level security` en la misma migración.
- [ ] Cada tabla tiene políticas `select`, `insert`, `update` y `delete` (o un comentario que justifique la ausencia, como en `change_log`).
- [ ] Las políticas `update` tienen `using` y `with check`.
- [ ] Las políticas usan `is_project_member(project_id, ...)` con los roles de la matriz de la Spec 8.
- [ ] Las vistas usan `security_invoker = on`; las funciones `security definer` fijan `search_path`.
- [ ] `npm run check:rls` y `npm run test:rls` pasan.
- [ ] `grep -rniE "service_role|SERVICE_ROLE" src/ index.html vite.config.js` no encuentra usos (vite.config.js solo en el guard); tras `npm run build`, tampoco aparece en `dist/`.
- [ ] Ninguna variable `VITE_` contiene secretos.
- [ ] La API no crea clientes con `SUPABASE_SERVICE_ROLE_KEY` en `server/routes` ni `server/middlewares`.
- [ ] `helmet()`, `cors` con orígenes explícitos (sin `*`) y `credentials: true`, `express.json({ limit: '1mb' })`.
- [ ] Rate limit con almacén compartido (Redis); límite estricto en autenticación y firma (5 / 15 min → 429).
- [ ] `vercel.json` conserva las cabeceras CSP, X-Frame-Options, HSTS, nosniff, Referrer-Policy y Permissions-Policy; `connect-src` apunta al proyecto de Supabase concreto antes de producción.
- [ ] Los logs (pino) no incluyen tokens, cabecera `authorization`, correos ni texto de VOC.
- [ ] `npm audit --audit-level=high` sin hallazgos.

## Spec 8 — Autenticación y RBAC

- [ ] Ningún control de acceso lee `user_metadata`, `raw_user_meta_data` ni un rol del cuerpo de la petición.
- [ ] Toda ruta de proyecto pasa por `authenticate` y `requireProjectRole` con los roles de la matriz de permisos.
- [ ] No miembro → 404; miembro sin rol → 403; gate no aprobado → 409.
- [ ] El líder técnico no puede aprobar gates (separación de funciones).
- [ ] El refresh token solo viaja en cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`; nada de tokens en `localStorage`.
- [ ] `/refresh` y `/logout` exigen la cabecera anti-CSRF.
- [ ] El interceptor del cliente evita renovaciones simultáneas del token.
- [ ] Los guards de vue-router usan `meta.roles`, y existe prueba de que el endpoint devuelve 403 aunque se salte el guard.
- [ ] La aprobación de gates exige reautenticación reciente (token de firma de 5 min).

## Transversal

- [ ] `grep -rn "v-html" src/` sin resultados con contenido de usuario.
- [ ] Esquemas Zod `.strict()` y `check` equivalentes en la BD.
- [ ] Seeds y fixtures solo con datos ficticios (`@example.test`).
- [ ] Ningún `.env` real, dump `.sql` ni carpeta `temp/` en el diff.

Termina con una lista priorizada (crítico / alto / medio) de lo que no cumple y la corrección propuesta para cada punto.
