# Spec 3: Renderizado y Gestión de Diagramas DAPS (Fase 2)

| Campo | Valor |
|---|---|
| Fase del marco | Fase 2: Análisis y Priorización |
| Depende de | Spec 0, Spec 2 |
| Rama Git | `feature/editor-diagramas-daps` |
| Estado | Pendiente |

**Descripción:** editor visual de diagramas DAPS (Data-Analytic Problem Structure) que estructuran el problema analítico conectando objetivos de negocio, KPI, preguntas analíticas y fuentes de datos.

**Relación con el marco:** la Fase 2 produce el diagrama DAPS con objetivo de negocio, pregunta analítica, KPI y fuente de datos (De Mast y Lokkerbol, 2024).

### Cambios respecto a la versión 1.0

- Se añade la tabla `daps_diagrams`; los nodos y aristas pertenecen a un diagrama y a un proyecto.
- Se agrega el nodo "Fuente de datos", que el marco menciona y la spec omitía.
- Los nodos pueden enlazarse a entidades reales (objetivo, KPI, requisito, fuente de datos), para que el diagrama alimente la trazabilidad y no sea un dibujo aislado.
- La sincronización atómica se implementa con una función PostgreSQL invocada por RPC, con control de concurrencia optimista.

### Modelo de datos

```sql
create type tipo_nodo_daps as enum
  ('objetivo_negocio','kpi','pregunta_analitica','fuente_datos','factor_influencia');

create table daps_diagrams (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  objetivo_id uuid references business_objectives(id),
  nombre      varchar(150) not null,
  version     int not null default 1,          -- concurrencia optimista
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);

create table daps_nodes (
  id              uuid primary key,              -- lo genera el cliente (Vue Flow)
  diagram_id      uuid not null references daps_diagrams(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  type            tipo_nodo_daps not null,
  label           varchar(200) not null,
  descripcion     text,
  position_x      double precision not null,
  position_y      double precision not null,
  ref_objetivo_id    uuid references business_objectives(id),
  ref_kpi_id         uuid references kpis(id),
  ref_requirement_id uuid references requirements(id),
  ref_data_source_id uuid references data_sources(id)
);

create table daps_edges (
  id          uuid primary key,
  diagram_id  uuid not null references daps_diagrams(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  source_node uuid not null references daps_nodes(id) on delete cascade,
  target_node uuid not null references daps_nodes(id) on delete cascade,
  check (source_node <> target_node),
  unique (diagram_id, source_node, target_node)
);
```

> **Por validar:** el tipo `factor_influencia` es opcional. Antes de fijar el catálogo definitivo de nodos, conviene contrastarlo con los elementos exactos que proponen De Mast y Lokkerbol (2024), para que la herramienta use la misma notación del artículo.

### Reglas de conexión

| Origen | Destino permitido | Significado |
|---|---|---|
| Objetivo de negocio | KPI | El objetivo se mide mediante el KPI. |
| KPI | Pregunta analítica / Factor de influencia | Qué se necesita saber para mover el KPI. |
| Factor de influencia | Pregunta analítica | Hipótesis de causa que se debe investigar. |
| Pregunta analítica | Fuente de datos | De dónde se obtienen los datos para responderla. |

La API rechaza aristas fuera de esta tabla y diagramas con ciclos (verificación por búsqueda en profundidad). Límite de 500 nodos por diagrama.

### Backend

| Método | Ruta | Rol permitido | Descripción |
|---|---|---|---|
| POST | /api/v1/projects/:projectId/daps | Miembros (escritura) | Crea un diagrama vacío. |
| GET | /api/v1/daps/:diagramId | Miembros | Devuelve nodos, aristas y `version`. |
| PUT | /api/v1/daps/:diagramId/sync | Miembros (escritura) | Reemplaza el estado completo en una sola transacción. Si la `version` enviada no coincide con la almacenada responde 409. |
| DELETE | /api/v1/daps/:diagramId | lider_tecnico | Elimina el diagrama. |

El cliente JavaScript de Supabase no abre transacciones de varias sentencias, por lo que la sincronización se encapsula en una función PL/pgSQL; toda función se ejecuta de forma atómica:

```sql
create or replace function sync_daps_diagram(
  p_diagram_id uuid, p_version int, p_nodes jsonb, p_edges jsonb)
returns int language plpgsql security invoker as $$
declare v_project uuid; v_new_version int;
begin
  update daps_diagrams
     set version = version + 1, updated_by = auth.uid(), updated_at = now()
   where id = p_diagram_id and version = p_version
  returning project_id, version into v_project, v_new_version;
  if not found then
    raise exception 'VERSION_CONFLICT' using errcode = 'P0409';
  end if;

  delete from daps_edges where diagram_id = p_diagram_id;
  delete from daps_nodes where diagram_id = p_diagram_id;

  insert into daps_nodes (id, diagram_id, project_id, type, label, descripcion,
                          position_x, position_y, ref_kpi_id, ref_data_source_id)
  select (n->>'id')::uuid, p_diagram_id, v_project, (n->>'type')::tipo_nodo_daps,
         n->>'label', n->>'descripcion', (n->>'x')::float8, (n->>'y')::float8,
         nullif(n->>'ref_kpi_id','')::uuid, nullif(n->>'ref_data_source_id','')::uuid
  from jsonb_array_elements(p_nodes) n;

  insert into daps_edges (id, diagram_id, project_id, source_node, target_node)
  select (e->>'id')::uuid, p_diagram_id, v_project,
         (e->>'source')::uuid, (e->>'target')::uuid
  from jsonb_array_elements(p_edges) e;

  return v_new_version;
end $$;
```

Se declara `security invoker` para que las políticas RLS se sigan aplicando dentro de la función. La API invoca `supabase.rpc('sync_daps_diagram', {...})` con el cliente autenticado como el usuario (ver Spec 7).

### Frontend

- `DapsCanvas.vue` con `@vue-flow/core`, más `@vue-flow/background`, `@vue-flow/controls` y `@vue-flow/minimap`.
- Nodos personalizados: `ObjetivoNode.vue`, `KpiNode.vue`, `PreguntaNode.vue`, `FuenteDatosNode.vue` (colores y formas distintos, leyenda visible).
- Validación de conexiones en el cliente con `isValidConnection` usando la misma tabla de reglas; guardado automático con retardo (debounce de 2 s) y aviso si hay conflicto de versión.
- Exportación a PNG/SVG del lienzo para anexarlo al acta de validación.

### Criterios de aceptación

- Si dos usuarios editan a la vez, el segundo en guardar recibe 409 y la interfaz le ofrece recargar sin perder su trabajo local.
- Un fallo al insertar una arista revierte también el borrado de nodos (el diagrama queda como estaba).
- No se puede conectar una fuente de datos directamente a un objetivo de negocio.

**Rama Git:** `feature/editor-diagramas-daps`.

---

[← Spec 2](spec-02-priorizacion-kano.md) · [Índice](README.md) · [Spec 4 →](spec-04-fichas-ctq-kpi.md)
