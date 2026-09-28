# Spec 2: Motor de Priorización mediante Modelo Kano (Fase 2)

| Campo | Valor |
|---|---|
| Fase del marco | Fase 2: Análisis y Priorización |
| Depende de | Spec 0, Spec 1 |
| Rama Git | `feature/priorizacion-modelo-kano` |
| Estado | Pendiente |

**Descripción:** clasificación y priorización de los requisitos mediante el cuestionario Kano bidireccional, agregación de respuestas de varios stakeholders y registro de la evaluación de viabilidad temprana.

**Relación con el marco:** la Fase 2 exige documentar tipo de requisito, prioridad Kano, nivel de factibilidad (alta, media, baja), KPI asociado, pregunta analítica derivada y dependencias; y producir la matriz de priorización Kano y el informe de viabilidad temprana.

### Cambios respecto a la versión 1.0

- Las respuestas dejan de ser enteros (`funcional_score`) y pasan a ser categóricas, como exige el método Kano.
- Se amplían las categorías: además de básica, desempeño y atractiva, el método produce indiferente, inversa y cuestionable. Descartarlas ocultaría respuestas inconsistentes.
- Se separan las respuestas individuales del resultado agregado por requisito (moda y coeficientes de satisfacción).
- Se añade la evaluación de viabilidad temprana y se corrige el uso de Pinia: por sí solo no persiste el estado al recargar la página.

### Lógica del método Kano

Por cada requisito, el encuestado responde dos preguntas: la funcional ("¿Cómo se sentiría si el sistema tuviera X?") y la disfuncional ("¿Cómo se sentiría si no lo tuviera?"), con cinco opciones: me gusta, lo espero, me es indiferente, lo tolero, me disgusta. La combinación se clasifica con la tabla de evaluación estándar:

| Funcional \ Disfuncional | Me gusta | Lo espero | Indiferente | Lo tolero | Me disgusta |
|---|---|---|---|---|---|
| **Me gusta** | Q | A | A | A | O |
| **Lo espero** | R | I | I | I | M |
| **Indiferente** | R | I | I | I | M |
| **Lo tolero** | R | I | I | I | M |
| **Me disgusta** | R | R | R | R | Q |

Leyenda: **M** = obligatoria/básica; **O** = unidimensional/desempeño; **A** = atractiva; **I** = indiferente; **R** = inversa; **Q** = cuestionable (respuesta contradictoria).

Agregación por requisito: la categoría final es la moda de las respuestas válidas (excluyendo Q). En caso de empate se aplica la regla M > O > A > I. Además se calculan los coeficientes de satisfacción: **Better** = (A + O) / (A + O + M + I) y **Worse** = −(O + M) / (A + O + M + I), útiles para ordenar el backlog de forma continua. Si más del 20 % de las respuestas de un requisito son Q, el requisito se marca para revisión de redacción.

### Modelo de datos

```sql
create type respuesta_kano  as enum ('me_gusta','lo_espero','indiferente','lo_tolero','me_disgusta');
create type categoria_kano  as enum ('M','O','A','I','R','Q');

create table kano_responses (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null references projects(id) on delete cascade,
  requirement_id         uuid not null references requirements(id) on delete cascade,
  stakeholder_id         uuid not null references stakeholders(id),
  respuesta_funcional    respuesta_kano not null,
  respuesta_disfuncional respuesta_kano not null,
  importancia            smallint check (importancia between 1 and 9),  -- opcional
  categoria              categoria_kano not null,     -- calculada por el backend
  created_at             timestamptz not null default now(),
  unique (requirement_id, stakeholder_id)
);

create view kano_results as
select requirement_id,
       count(*) filter (where categoria='M') as m, count(*) filter (where categoria='O') as o,
       count(*) filter (where categoria='A') as a, count(*) filter (where categoria='I') as i,
       count(*) filter (where categoria='R') as r, count(*) filter (where categoria='Q') as q,
       round((count(*) filter (where categoria in ('A','O')))::numeric
         / nullif(count(*) filter (where categoria in ('A','O','M','I')),0), 3) as better,
       round(-(count(*) filter (where categoria in ('O','M')))::numeric
         / nullif(count(*) filter (where categoria in ('A','O','M','I')),0), 3) as worse
from kano_responses group by requirement_id;

create table feasibility_assessments (           -- informe de viabilidad temprana
  requirement_id        uuid primary key references requirements(id) on delete cascade,
  factibilidad_tecnica  nivel_factibilidad not null,
  disponibilidad_datos  nivel_factibilidad not null,
  riesgos               text,
  justificacion         text not null,
  evaluado_por          uuid not null references auth.users(id),
  evaluado_at           timestamptz not null default now()
);
```

La categoría dominante (moda con regla de desempate) se calcula en el backend a partir de `kano_results` y se guarda en `requirements` al cerrar la ronda de encuestas, para que quede sujeta a auditoría (Spec 5).

### Backend

| Método | Ruta | Rol permitido | Descripción |
|---|---|---|---|
| POST | /api/v1/requirements/:reqId/kano-responses | Miembros vinculados a un stakeholder | Recibe el par de respuestas, calcula la categoría con la tabla de evaluación y la guarda. Reemplaza al antiguo `kano-evaluate`. |
| GET | /api/v1/requirements/:reqId/kano-result | Miembros | Distribución, categoría dominante, Better y Worse. |
| GET | /api/v1/projects/:projectId/kano-matrix | Miembros | Matriz de priorización de todos los requisitos. |
| PUT | /api/v1/requirements/:reqId/feasibility | lider_tecnico, cientifico_datos | Registra la evaluación de viabilidad temprana. |

```js
const RESP = ['me_gusta', 'lo_espero', 'indiferente', 'lo_tolero', 'me_disgusta'];
const TABLA = [            // filas: funcional; columnas: disfuncional
  ['Q', 'A', 'A', 'A', 'O'],
  ['R', 'I', 'I', 'I', 'M'],
  ['R', 'I', 'I', 'I', 'M'],
  ['R', 'I', 'I', 'I', 'M'],
  ['R', 'R', 'R', 'R', 'Q'],
];
export function clasificarKano(funcional, disfuncional) {
  const f = RESP.indexOf(funcional), d = RESP.indexOf(disfuncional);
  if (f < 0 || d < 0) throw new Error('Respuesta Kano inválida');
  return TABLA[f][d];
}
```

### Frontend

- `KanoQuestionnaire.vue`: presenta, por cada requisito, la pregunta funcional y la disfuncional redactadas en lenguaje de negocio, con barra de progreso.
- Estado en Pinia con `pinia-plugin-persistedstate` (almacenamiento de sesión) para no perder respuestas al navegar o recargar; además se envía cada respuesta al servidor al confirmarla, de modo que el servidor sea la fuente de verdad.
- `KanoMatrixView.vue`: diagrama de dispersión Better vs. |Worse| con los cuadrantes de Kano y tabla ordenable.
- `FeasibilityForm.vue`: registro de factibilidad técnica y disponibilidad de datos.

### Criterios de aceptación

- Las 25 combinaciones de respuestas producen exactamente la categoría de la tabla (prueba unitaria parametrizada).
- Un stakeholder no puede responder dos veces el mismo requisito (409); puede actualizar su respuesta mediante PUT.
- Recargar el navegador a mitad del cuestionario conserva las respuestas.
- Todos los endpoints exigen JWT válido (Spec 8); sin token responden 401.

**Rama Git:** `feature/priorizacion-modelo-kano`.

---

[← Spec 1](spec-01-elicitacion.md) · [Índice](README.md) · [Spec 3 →](spec-03-daps.md)
