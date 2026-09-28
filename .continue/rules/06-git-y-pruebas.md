---
name: Git y pruebas
description: Ramas, commits, pull requests, tipos de prueba y Definición de Terminado.
alwaysApply: true
---

# Git y pruebas

Fuente de verdad: `AGENTS.md` §6 (Git) y §8 (Definición de Terminado).

## Git

- Ramas: `feature/`, `fix/`, `chore/` + kebab-case. Usa la rama indicada en el encabezado de cada spec.
- Commits: Conventional Commits en español (`feat: agrega endpoint de stakeholders`).
- PR obligatorio hacia `main`, con al menos una revisión y CI en verde. Nunca push directo a `main`.
- No se versionan `.env*` (salvo `.example`), dumps `.sql`, `temp/` ni scripts de un solo uso.

## Qué prueba va dónde

| Tipo          | Carpeta              | Herramienta        | Qué cubre                                                                                                 |
| ------------- | -------------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| Unitaria      | `tests/unit/`        | Vitest             | Funciones puras de `server/services/` y `src/` (Kano, saliencia, máquina de estados, detección de ciclos) |
| Integración   | `tests/integration/` | Vitest + Supertest | Endpoints contra Supabase local: feliz, 400, 401, 403/404, regla de negocio                               |
| Políticas RLS | `supabase/tests/`    | pgTAP              | Acceso de miembro con rol, sin rol y no miembro a cada tabla                                              |
| End-to-end    | `tests/e2e/`         | Playwright         | Flujos críticos de cada fase                                                                              |

- Nombre de archivos: `<modulo>.test.js` (unit/integración), `<flujo>.spec.ts` (e2e), `<tabla>.test.sql` (pgTAP).
- Los criterios de aceptación de la spec se citan en la descripción del `it(...)`.
- Datos de prueba ficticios y creados por la propia prueba; ninguna prueba depende del orden de ejecución.

## Antes de abrir un PR

```bash
npm run lint && npm run test:unit && npm run db:reset && npm run check:rls && npm run test:rls && npm run test:integration
```
