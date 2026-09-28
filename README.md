# Trazalitica

> Gestión y trazabilidad de requisitos para proyectos de análisis de datos, desde la voz del cliente hasta el KPI.

Plataforma web de soporte al **Marco de trabajo para la gestión de requisitos en proyectos de análisis de datos** (UNAC, GI2A). Acompaña a un equipo por las cuatro fases del marco y deja evidencia trazable de cada decisión:

1. **Elicitación** — stakeholders con modelo de saliencia, actas, Voz del Cliente, caso de negocio.
2. **Análisis y Priorización** — cuestionario Kano, viabilidad temprana, diagramas DAPS.
3. **Especificación** — fichas CTQ-KPI, árbol CTQ, backlog priorizado.
4. **Validación y Trazabilidad** — matriz de trazabilidad, registro de cambios inmutable, gates de validación.

Las especificaciones técnicas están en [`docs/specs/`](docs/specs/README.md) y las decisiones de arquitectura en [`docs/adr/`](docs/adr/).

## Stack

Supabase (PostgreSQL + Auth + RLS) · Node.js 20 + Express + Zod · Vue 3 + Pinia + vue-router + Tailwind · Vercel. Justificación en [ADR-0001](docs/adr/0001-eleccion-del-stack.md).

## Requisitos

- Node.js 20 LTS o superior.
- Docker (para Supabase local).
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) en el `PATH` (`scoop install supabase` en Windows, `brew install supabase/tap/supabase` en macOS).
- `psql` (cliente de PostgreSQL) para `npm run check:rls`.

## Puesta en marcha

```bash
npm ci
cp .env.example .env          # completar con los valores de `supabase status`
npm run db:start              # Supabase local en Docker
npm run db:reset              # aplica migraciones y seed.sql
npm run seed:dev              # usuarios y proyecto ficticios
npm run dev:api               # API en http://localhost:3000/api/v1
npm run dev                   # frontend en http://localhost:5173
```

Todos los comandos (pruebas, migraciones, tipos) están en [`AGENTS.md` §4](AGENTS.md#4-comandos).

## Estructura

```
api/            Entrada serverless de Vercel
server/         API Express (rutas, esquemas Zod, servicios, middlewares)
src/            Frontend Vue, componentes organizados por fase del marco
supabase/       config.toml, migraciones, seed.sql y pruebas pgTAP
tests/          unit/, integration/, e2e/
scripts/        gen-types.sh, check-rls.sql, seed-dev.js
docs/           specs/ y adr/
```

## Cómo contribuir

- Lee [`AGENTS.md`](AGENTS.md): convenciones, reglas de seguridad y Definición de Terminado. Aplica igual a personas y a agentes de IA.
- Una rama por spec (`feature/`, `fix/`, `chore/` en kebab-case), commits con Conventional Commits y PR hacia `main` con CI en verde.
- Configuración para agentes: [`.claude/`](.claude/) (Claude Code), [`.continue/rules/`](.continue/rules/) (Continue) y [`.agents/skills/`](.agents/skills/) (plantillas paso a paso).

## Seguridad

Nunca subas archivos `.env`, dumps de base de datos ni datos reales del estudio de caso. La llave `service_role` de Supabase no se usa en el frontend ni se declara con prefijo `VITE_`. Detalles en [`AGENTS.md` §7](AGENTS.md#7-reglas-de-seguridad-obligatorias).
