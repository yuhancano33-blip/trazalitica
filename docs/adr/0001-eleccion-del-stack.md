# ADR-0001: Supabase + Express + Vue 3 desplegados en Vercel

| Campo              | Valor                            |
| ------------------ | -------------------------------- |
| Estado             | Aceptado                         |
| Fecha              | 2026-09-27                       |
| Autores            | Equipo del proyecto (UNAC, GI2A) |
| Specs relacionadas | Todas; en especial 0, 5, 7 y 8   |

## Contexto

La plataforma debe soportar la aplicación del marco de cuatro fases durante el estudio de caso del OE3. Eso impone:

- **Aislamiento estricto entre proyectos.** Las VOC y los datos del caso pueden contener información personal (Ley 1581 de 2012). Un usuario de un proyecto no puede ver nada de otro (Spec 7).
- **Roles por proyecto** (stakeholder de negocio, analista, científico de datos, líder técnico), no globales (Spec 8).
- **Auditoría inmutable y con autor** de cada cambio en requisitos y fichas (Spec 5).
- **Operaciones atómicas** (sincronización DAPS, transición de fase con bloqueo de fila).
- **Interfaces ricas:** editor de diagramas, matrices grandes y gráficos.
- **Equipo pequeño**, académico, sin personal de operaciones, con presupuesto mínimo.

## Opciones consideradas

1. **Supabase (PostgreSQL + Auth + RLS) + API Node/Express + Vue 3, en Vercel.**
2. **Backend propio completo** (PostgreSQL gestionado + autenticación propia con Passport/JWT + Express), sin RLS.
3. **Backend-as-a-Service sin SQL** (Firebase/Firestore) con reglas de seguridad y cliente directo.

## Decisión

Se elige la opción 1:

- **Supabase** aporta PostgreSQL (restricciones `check`, llaves foráneas, funciones PL/pgSQL transaccionales, triggers de auditoría) y RLS, que aplica el aislamiento por proyecto en la base de datos aunque la API tenga un error. Supabase Auth resuelve JWT, refresh tokens y MFA TOTP para la firma de gates.
- **Express + Zod** concentra la lógica del marco que no pertenece a la BD (clasificación Kano, máquina de estados, validación condicional por tipo de requisito) y valida la entrada en una segunda capa. Zod permite generar OpenAPI y compartir esquemas con el frontend.
- **Vue 3** (Composition API, Pinia, vue-router) tiene un ecosistema maduro para las vistas exigidas: `@vue-flow/core` (DAPS), `ag-grid-vue3` Community (trazabilidad) y `vue-echarts` (saliencia, Kano, métricas).
- **Vercel** despliega frontend y API (serverless) desde el mismo repositorio, con cabeceras de seguridad declarativas en `vercel.json` y vistas previas por PR.

La opción 2 obliga a reimplementar autenticación y a confiar el aislamiento solo al código de la API. La opción 3 no ofrece integridad referencial, transacciones con SQL ni triggers, que las Specs 0, 3, 5 y 6 necesitan.

## Consecuencias

- **Positivas:** defensa en profundidad (Zod + RLS + `check`); auditoría con `auth.uid()` en la BD; poca infraestructura que operar; el mismo SQL corre en local (`supabase start`) y en CI.
- **Negativas:**
  - La API debe crear un cliente de Supabase **por petición** con el JWT del usuario; si alguien usa `service_role` por comodidad, RLS y la autoría del `change_log` dejan de funcionar. Mitigación: reglas en `AGENTS.md` §7, regla ESLint y verificación en CI.
  - En serverless, el rate limit en memoria no sirve: se necesita un almacén compartido (Redis gestionado).
  - Las funciones serverless tienen arranque en frío y límite de duración; la generación de actas PDF debe mantenerse ligera.
  - Dependencia de un proveedor para Auth; mitigada porque los datos están en PostgreSQL estándar y las migraciones son SQL versionado.
- **Seguimiento:** revisar tiempos de la matriz de trazabilidad (< 2 s con 5 000 filas, Spec 5) y el costo de Redis y Supabase antes del estudio de caso.

## Referencias

- `docs/specs/README.md` §1.1 (stack de referencia).
- `docs/specs/spec-07-seguridad.md` y `docs/specs/spec-08-autenticacion.md`.
- Supabase: Row Level Security — https://supabase.com/docs/guides/database/postgres/row-level-security
