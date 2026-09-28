---
name: Seguridad
description: Reglas de seguridad no negociables (Specs 7 y 8). Aplica a todo el código.
alwaysApply: true
---

# Seguridad

Las ocho reglas de `AGENTS.md` §7 son obligatorias. Antes de proponer código, verifica que no incumples ninguna:

1. **Toda tabla nueva:** RLS habilitado + políticas SELECT, INSERT, UPDATE y DELETE en la misma migración.
2. **Roles:** se leen de `project_members.rol`. Nunca de `user_metadata`, del cuerpo de la petición ni del frontend.
3. **`service_role`:** nunca en `src/`, nunca con prefijo `VITE_`, nunca para atender peticiones de usuario. `vite.config.js` falla si detecta una variable `VITE_` con `SERVICE_ROLE`.
4. **Cliente por petición:** usa siempre `req.supabase` (creado en `authenticate` con el JWT del usuario). No importes un cliente global en las rutas.
5. **XSS:** prohibido `v-html` con datos de usuario. Interpola con `{{ }}`. Texto plano en Zod rechaza `<` y `>`.
6. **Doble validación:** Zod `.strict()` en la API + `check`/`not null`/FK en la BD.
7. **Borde HTTP:** `helmet()`, `cors` con orígenes explícitos (sin `*`), `express.json({ limit: '1mb' })`, rate limit con Redis.
8. **Datos ficticios** en seeds y pruebas (`@example.test`).

## Señales de alarma — detente y corrige

- `createClient(..., SUPABASE_SERVICE_ROLE_KEY)` dentro de `server/routes/` o `server/middlewares/`.
- `user_metadata`, `raw_user_meta_data` o `req.body.rol` usados para autorizar.
- Un `403` para un usuario que no es miembro (debe ser `404`).
- Un gate no aprobado respondiendo `403` (debe ser `409`).
- Logs que imprimen `authorization`, tokens, correos o texto de VOC.
- Guards de vue-router presentados como control de seguridad.

Para una revisión completa usa el comando `/revisar-seguridad` (`.claude/commands/revisar-seguridad.md`).
