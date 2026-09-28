# Spec 4: Fichas Multidimensionales CTQ-KPI (Fase 3)

| Campo | Valor |
|---|---|
| Fase del marco | Fase 3: Especificación |
| Depende de | Spec 0, Spec 1, Spec 2 |
| Rama Git | `feature/fichas-especificacion-ctq` |
| Estado | Pendiente |

**Descripción:** formalización de los requisitos priorizados en fichas estandarizadas con métricas Critical-to-Quality (CTQ), KPI, criterios de aceptación y criterios de calidad de datos; construcción del árbol CTQ y del backlog priorizado.

**Relación con el marco:** la ficha de especificación debe contener identificador único, descripción, tipo, origen, criterio de aceptación, KPI o CTQ asociado, calidad de datos requerida, prioridad y estado. Los artefactos son la ficha, el backlog priorizado y la matriz CTQ-KPI (Morlock y Boßlau, 2021; Carvalho et al., 2024).

### Cambios respecto a la versión 1.0

- La ficha se vincula a un requisito del núcleo (antes era una tabla aislada sin `project_id` ni `requirement_id`), con lo que hereda código, descripción, tipo, origen, prioridad y estado.
- Se modela el árbol CTQ (necesidad → impulsor → CTQ medible con límites), que la Fase 3 exige y la versión 1.0 no incluía.
- La calidad de datos pasa de texto libre a una estructura por dimensiones con umbrales verificables.
- La validación condicional por tipo de requisito se aplica también en el servidor, no solo en el formulario.

### Modelo de datos

```sql
create type nivel_ctq as enum ('necesidad','impulsor','ctq');

create table ctq_nodes (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  parent_id      uuid references ctq_nodes(id) on delete cascade,
  nivel          nivel_ctq not null,
  descripcion    text not null,
  voc_id         uuid references voc_entries(id),   -- origen en la VOC
  -- solo para nivel = 'ctq':
  metrica        varchar(150),
  unidad         varchar(30),
  valor_objetivo numeric,
  limite_inferior numeric,
  limite_superior numeric,
  metodo_medicion text,
  kpi_id         uuid references kpis(id),
  check (nivel <> 'ctq' or (metrica is not null and metodo_medicion is not null))
);

create table requirement_specs (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  requirement_id      uuid not null references requirements(id) on delete cascade,
  version             int not null default 1,
  criterio_aceptacion text not null check (char_length(criterio_aceptacion) >= 20),
  ctq_node_id         uuid references ctq_nodes(id),
  kpi_id              uuid references kpis(id),
  calidad_datos       jsonb not null,
  detalle_tipo        jsonb not null default '{}'::jsonb,   -- campos condicionales por tipo
  vigente             boolean not null default true,
  created_by          uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  check (ctq_node_id is not null or kpi_id is not null),
  unique (requirement_id, version)
);
create unique index uq_spec_vigente on requirement_specs(requirement_id) where vigente;
```

Cada edición de la ficha crea una nueva versión (la anterior queda con `vigente = false`), lo que conserva la historia completa además del `change_log` de la Spec 5.

### Estructura de calidad de datos

Se toman como referencia las características de calidad de datos de la norma ISO/IEC 25012 (exactitud, completitud, consistencia, credibilidad y actualidad), complementadas con unicidad y validez, que son de uso común en proyectos analíticos. Cada dimensión incluida debe tener un umbral medible:

```json
{
  "completitud":  { "umbral": 0.98, "regla": "campo fecha_venta no nulo" },
  "exactitud":    { "umbral": 0.95, "regla": "coincidencia con facturación ERP" },
  "consistencia": { "umbral": 1.0,  "regla": "sumatoria diaria = cierre contable" },
  "actualidad":   { "max_retraso_horas": 24 },
  "unicidad":     { "umbral": 1.0,  "regla": "id_transaccion único" }
}
```

### Campos condicionales por tipo de requisito (`detalle_tipo`)

| Tipo | Campos obligatorios adicionales | Ejemplo |
|---|---|---|
| funcional | Actor, disparador, resultado esperado | El analista filtra ventas por región y obtiene el total en menos de 3 s. |
| no_funcional | Atributo de calidad (ISO/IEC 25010), métrica y umbral | Disponibilidad ≥ 99,5 % mensual. |
| datos | Fuente de datos, granularidad, volumen estimado, frecuencia de actualización, datos sensibles (sí/no) | Transacciones diarias del ERP, 2 M filas/mes. |
| modelo | Métrica de desempeño y umbral, conjunto de evaluación, robustez, criterios de sesgo/equidad, explicabilidad requerida | F1 ≥ 0,80 en conjunto de prueba estratificado; diferencia de recall entre grupos ≤ 5 puntos. |

Los requisitos de tipo modelo incluyen sesgo, equidad y explicabilidad porque el propio marco teórico, siguiendo a Ahmad et al. (2022) y Habiba et al. (2024), los identifica como categorías propias de los sistemas basados en aprendizaje automático.

### Backend

| Método | Ruta | Rol permitido | Descripción |
|---|---|---|---|
| POST | /api/v1/requirements/:reqId/spec | lider_tecnico, analista_requisitos, cientifico_datos | Crea la versión 1 de la ficha. |
| PUT | /api/v1/requirements/:reqId/spec | Ídem | Crea una nueva versión vigente. |
| GET | /api/v1/requirements/:reqId/spec?version=n | Miembros | Ficha vigente o versión específica. |
| CRUD | /api/v1/projects/:projectId/ctq-nodes | Miembros (escritura) | Árbol CTQ. |
| GET | /api/v1/projects/:projectId/ctq-kpi-matrix | Miembros | Matriz CTQ-KPI. |
| GET | /api/v1/projects/:projectId/backlog | Miembros | Backlog ordenado por categoría Kano (M, O, A), Better y factibilidad. |

Validación con unión discriminada de Zod: el middleware `validateBody(specSchema)` rechaza con 422 cualquier POST o PUT sin `criterio_aceptacion`, sin `calidad_datos` o sin los campos obligatorios del tipo del requisito. El tipo se lee del requisito en base de datos, no del cuerpo de la petición, para evitar que un cliente lo altere.

```js
const detalleModelo = z.object({
  metrica: z.enum(['accuracy', 'precision', 'recall', 'f1', 'auc', 'rmse', 'mae', 'mape']),
  umbral: z.number(),
  conjunto_evaluacion: z.string().min(5),
  criterios_sesgo: z.string().min(5),
  explicabilidad: z.enum(['no_requerida', 'global', 'local']),
});
export const specSchema = z.discriminatedUnion('tipo', [
  base.extend({ tipo: z.literal('funcional'),    detalle_tipo: detalleFuncional }),
  base.extend({ tipo: z.literal('no_funcional'), detalle_tipo: detalleNoFuncional }),
  base.extend({ tipo: z.literal('datos'),        detalle_tipo: detalleDatos }),
  base.extend({ tipo: z.literal('modelo'),       detalle_tipo: detalleModelo }),
]);
```

### Frontend

- `SpecCardEditor.vue`: muestra los datos heredados del requisito (código, origen, prioridad Kano, estado) y despliega los campos condicionales según el tipo.
- `CtqTreeEditor.vue`: árbol jerárquico necesidad → impulsor → CTQ con validación de límites (inferior ≤ objetivo ≤ superior).
- `CtqKpiMatrix.vue` y `BacklogBoard.vue`: matriz y backlog ordenable; exportación de la ficha a PDF para el acta.

### Criterios de aceptación

- Un requisito de tipo modelo sin métrica de desempeño es rechazado con 422 aunque el formulario haya sido manipulado.
- Editar una ficha genera la versión n+1 y conserva la versión n consultable.
- Un CTQ con límite inferior mayor que el superior es rechazado.

**Rama Git:** `feature/fichas-especificacion-ctq`.

---

[← Spec 3](spec-03-daps.md) · [Índice](README.md) · [Spec 5 →](spec-05-trazabilidad.md)
