---
name: Stack y arquitectura
description: Capas del sistema, dónde va cada cosa y cómo se relacionan con las fases del marco.
alwaysApply: true
---

# Stack y arquitectura

Fuente de verdad: `AGENTS.md` (secciones 1 a 3). Esta regla resume lo que necesitas para ubicar código.

- **BD:** Supabase (PostgreSQL 15+, Auth, RLS). El esquema vive solo en `supabase/migrations/`.
- **API:** Express en `server/`, expuesta en Vercel mediante `api/index.js`. Todo bajo `/api/v1`.
- **Frontend:** Vue 3 + `<script setup>`, Pinia, vue-router, Tailwind, en `src/`.

## Flujo de una petición

```
Vue (store Pinia) → fetch /api/v1/... con Bearer token
  → authenticate (crea req.supabase con el JWT del usuario)
  → requireProjectRole(roles)
  → validateBody(schema)
  → handler de la ruta → service (lógica pura) → req.supabase (RLS aplica)
  → errorHandler (formato { error: { code, message, details } })
```

## Dónde va cada cosa

| Necesito…                                              | Lugar                                                 |
| ------------------------------------------------------ | ----------------------------------------------------- |
| Tabla, función, trigger, política                      | `supabase/migrations/<timestamp>_<nombre>.sql`        |
| Endpoint                                               | `server/routes/v1/<recurso>.routes.js`                |
| Validación de entrada                                  | `shared/schemas/<recurso>.schema.js` (Zod)            |
| Regla de negocio (Kano, saliencia, máquina de estados) | `server/services/` como funciones puras               |
| Pantalla                                               | `src/views/`; componentes en `src/components/<fase>/` |

## Reglas

- No agregues dependencias fuera del stack sin un ADR en `docs/adr/`.
- Operaciones de varias sentencias que deben ser atómicas van en una función PL/pgSQL invocada con `rpc` (el cliente JS no abre transacciones). Usa `security invoker` salvo razón documentada.
- Las librerías específicas de una spec (Vue Flow, AG Grid Community, ECharts) se instalan en la rama de esa spec.
