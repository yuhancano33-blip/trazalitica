# Spec 0: Núcleo de datos del proyecto (nuevo)

| Campo | Valor |
|---|---|
| Fase del marco | Transversal |
| Depende de | — |
| Rama Git | `feature/nucleo-datos-proyecto` |
| Estado | Pendiente |

**Descripción:** entidades comunes sobre las que se apoyan todas las fases. Esta spec no existía en la versión 1.0 y es prerrequisito de las demás.

**Relación con el marco:** el marco exige que cada requisito tenga identificador único, tipo, origen, objetivo de negocio asociado, prioridad, estado y dependencias; y que los KPI y fuentes de datos se vinculen al problema analítico.

### Modelo de datos (Supabase / PostgreSQL)

```sql
create type rol_proyecto      as enum ('stakeholder_negocio','lider_tecnico','cientifico_datos','analista_requisitos');
create type fase_marco        as enum ('elicitacion','analisis','especificacion','validacion','cerrado');
create type tipo_requisito    as enum ('funcional','no_funcional','datos','modelo');
create type estado_requisito  as enum ('borrador','priorizado','especificado','en_validacion','aprobado','rechazado','obsoleto');
create type nivel_factibilidad as enum ('alta','media','baja');

create table projects (
  id          uuid primary key default gen_random_uuid(),
  nombre      varchar(150) not null,
  descripcion text,
  fase_actual fase_marco not null default 'elicitacion',
  iteracion   int not null default 1,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  rol        rol_proyecto not null,
  added_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index idx_members_user on project_members(user_id, project_id);

create table business_objectives (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  codigo      varchar(20) not null,          -- p. ej. OBJ-01
  descripcion text not null,
  created_at  timestamptz not null default now(),
  unique (project_id, codigo)
);

create table data_sources (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  nombre      varchar(150) not null,
  tipo        varchar(50),                   -- ERP, CRM, API, archivo, sensor...
  responsable varchar(150),
  descripcion text
);

create table kpis (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  objetivo_id      uuid not null references business_objectives(id),
  nombre           varchar(150) not null,
  formula          text not null,
  unidad           varchar(30),
  meta             numeric,
  frecuencia       varchar(30),              -- diaria, semanal, mensual
  fuente_datos_id  uuid references data_sources(id)
);

create table requirements (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  codigo       varchar(20) not null,         -- p. ej. REQ-001
  titulo       varchar(200) not null,
  descripcion  text not null,
  tipo         tipo_requisito not null,
  objetivo_id  uuid not null references business_objectives(id),
  estado       estado_requisito not null default 'borrador',
  factibilidad nivel_factibilidad,
  version      int not null default 1,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, codigo)
);

create table requirement_dependencies (
  requirement_id uuid not null references requirements(id) on delete cascade,
  depends_on_id  uuid not null references requirements(id) on delete cascade,
  primary key (requirement_id, depends_on_id),
  check (requirement_id <> depends_on_id)
);
```

El campo de origen del requisito (`origen_voc_id`) se agrega en la migración de la Spec 1, cuando existe la tabla de VOC. La obligatoriedad de `objetivo_id` garantiza la trazabilidad hacia atrás desde el primer momento: no puede existir un requisito sin objetivo de negocio.

### Endpoints

| Método | Ruta | Rol permitido | Descripción |
|---|---|---|---|
| POST | /api/v1/projects | Autenticado | Crea proyecto; el creador queda como `lider_tecnico`. |
| GET | /api/v1/projects | Autenticado | Lista solo los proyectos donde el usuario es miembro. |
| POST | /api/v1/projects/:projectId/members | lider_tecnico | Agrega miembro con rol. |
| CRUD | /api/v1/projects/:projectId/objectives | Miembros (escritura: líder, analista) | Objetivos de negocio. |
| CRUD | /api/v1/projects/:projectId/requirements | Miembros (escritura: líder, analista, científico) | Requisitos; el código se asigna automáticamente. |
| CRUD | /api/v1/projects/:projectId/kpis | Miembros | KPI asociados a objetivos. |
| CRUD | /api/v1/projects/:projectId/data-sources | Miembros | Inventario de fuentes de datos. |

### Criterios de aceptación

- No es posible crear un requisito sin `objetivo_id` válido del mismo proyecto (respuesta 422).
- El código `REQ-NNN` es único por proyecto y se genera de forma secuencial sin colisiones bajo concurrencia.
- Una dependencia circular directa (A depende de A) es rechazada por la base de datos; los ciclos indirectos son rechazados por la API.

**Rama Git:** `feature/nucleo-datos-proyecto`.

---

[Índice](README.md) · [Spec 1 →](spec-01-elicitacion-stakeholders.md)
