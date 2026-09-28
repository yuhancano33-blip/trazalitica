# Spec 9: Métricas de Evaluación para el Estudio de Caso (nuevo)

| Campo | Valor |
|---|---|
| Fase del marco | Estudio de caso (OE3) |
| Depende de | Spec 0, Spec 4, Spec 5, Spec 6 |
| Rama Git | `feature/metricas-estudio-caso` |
| Estado | Pendiente |

**Descripción:** cálculo automático de indicadores que permitan medir el efecto del marco en el proyecto donde se aplique, a partir de los datos que la propia plataforma ya registra.

**Relación con el proyecto de investigación:** el Objetivo Específico 3 y los aspectos pendientes de la evidencia de aprendizaje plantean medir la reducción de sobrecostos, ambigüedades y retrabajos. El documento del marco define como criterios de evaluación la trazabilidad de las decisiones, la alineación entre objetivos y entregables y la percepción de los equipos. Esta spec convierte esos criterios en indicadores medibles.

### Indicadores

| Criterio | Indicador | Fuente en la plataforma |
|---|---|---|
| Trazabilidad | % de requisitos con traza completa (objetivo → ficha → artefacto de prueba) | Spec 5 (`v_traceability_matrix`) |
| Alineación | % de requisitos vinculados a un KPI con meta definida; % de objetivos con al menos un requisito aprobado | Specs 0, 4 |
| Ambigüedad | Observaciones de tipo "ambigüedad" por cada 10 requisitos en los gates | Spec 6 (`gate_observations`) |
| Retrabajo | Ediciones de requisitos o fichas posteriores a su aprobación; número de retrocesos de fase | Spec 5 (`change_log`), Spec 6 |
| Calidad de especificación | % de requisitos con criterio de aceptación medible y umbrales de calidad de datos | Spec 4 |
| Eficiencia del proceso | Tiempo de ciclo por fase; tasa de rechazo de gates | Spec 6 (`phase_gates`) |
| Percepción | Encuesta Likert (1–5) a equipos técnico y de negocio sobre claridad, comunicación y utilidad del marco | Tabla `perception_surveys` |

### Modelo de datos y API

```sql
create table perception_surveys (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id),
  momento     text not null check (momento in ('linea_base','intermedio','final')),
  respuestas  jsonb not null,           -- { "claridad": 4, "comunicacion": 5, ... }
  comentario  text,
  created_at  timestamptz not null default now(),
  unique (project_id, user_id, momento)
);

create table baseline_metrics (         -- datos de un proyecto previo sin el marco
  project_id uuid references projects(id) on delete cascade,
  indicador  text not null,
  valor      numeric not null,
  fuente     text not null,
  primary key (project_id, indicador)
);
```

| Método | Ruta | Rol permitido | Descripción |
|---|---|---|---|
| GET | /api/v1/projects/:projectId/metrics | Miembros | Indicadores calculados al momento de la consulta. |
| GET | /api/v1/projects/:projectId/metrics/export.csv | lider_tecnico | Exportación para análisis estadístico. |
| POST | /api/v1/projects/:projectId/perception-surveys | Miembros | Registra la encuesta del usuario. |

- `CaseStudyDashboard.vue`: tablero con los indicadores, su evolución por iteración y la comparación con la línea base.
- La encuesta aplicada en tres momentos (línea base, intermedio, final) permite contrastar la percepción antes y después de adoptar el marco, en línea con Runeson y Höst (2009).
- Consideración ética: consentimiento informado de los participantes y anonimización de las respuestas en la exportación.

**Rama Git:** `feature/metricas-estudio-caso`.

---

[← Spec 8](spec-08-autenticacion.md) · [Índice](README.md)
