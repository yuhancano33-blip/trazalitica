# Spec 5: Matriz de Trazabilidad Bidireccional y Registro Inmutable de Cambios (Fase 4)

| Campo | Valor |
|---|---|
| Fase del marco | Fase 4: Validación y Trazabilidad |
| Depende de | Spec 0, Spec 1, Spec 4 |
| Rama Git | `feature/matriz-trazabilidad-inmutable` |
| Estado | Pendiente |

**Descripción:** relación trazable entre cada requisito, el objetivo de negocio que lo originó y los artefactos técnicos derivados (diseño, desarrollo, prueba), con consulta hacia adelante y hacia atrás, y registro de cambios a prueba de alteraciones.

**Relación con el marco:** la trazabilidad se define como la capacidad de seguir un requisito hacia atrás (origen en la necesidad) y hacia adelante (artefactos derivados), según Sommerville (2011) e ISO/IEC/IEEE 29148:2018. La Fase 4 produce la matriz de trazabilidad y el registro de cambios.

### Cambios respecto a la versión 1.0

- Se define la estructura de la matriz, que en la versión 1.0 solo se nombraba.
- Se resuelve la identificación del usuario en el trigger cuando la API usa la llave de servicio.
- Se garantiza la inmutabilidad real de `change_log` (permisos, trigger de bloqueo y encadenamiento por hash).
- Se añade la detección de brechas de trazabilidad (requisitos sin prueba, objetivos sin requisitos).

### Modelo de datos

```sql
create type tipo_artefacto as enum
  ('diseno','codigo','prueba','dataset','modelo','notebook','dashboard','documento');
create type tipo_relacion  as enum ('implementa','verifica','deriva_de','documenta');

create table technical_artifacts (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tipo       tipo_artefacto not null,
  nombre     varchar(200) not null,
  url        text,                 -- repositorio, notebook, tablero
  commit_sha varchar(40),
  version    varchar(30)
);

create table requirement_artifacts (         -- traza hacia adelante
  requirement_id uuid references requirements(id) on delete cascade,
  artifact_id    uuid references technical_artifacts(id) on delete cascade,
  relacion       tipo_relacion not null,
  project_id     uuid not null references projects(id) on delete cascade,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  primary key (requirement_id, artifact_id, relacion)
);

create view v_traceability_matrix as        -- origen -> requisito -> artefacto
select r.project_id, o.codigo as objetivo, o.descripcion as objetivo_desc,
       v.necesidad_expresada as voc, s.nombre as stakeholder,
       r.codigo as requisito, r.titulo, r.tipo, r.estado,
       k.nombre as kpi, ta.tipo as artefacto_tipo, ta.nombre as artefacto,
       ra.relacion
from requirements r
join business_objectives o      on o.id = r.objetivo_id
left join voc_entries v         on v.id = r.origen_voc_id
left join stakeholders s        on s.id = v.stakeholder_id
left join requirement_specs sp  on sp.requirement_id = r.id and sp.vigente
left join kpis k                on k.id = sp.kpi_id
left join requirement_artifacts ra on ra.requirement_id = r.id
left join technical_artifacts ta   on ta.id = ra.artifact_id;
```

La vista debe crearse con `security_invoker = on` (`create view ... with (security_invoker = on)`) para que respete las políticas RLS del usuario que consulta.

### Registro de cambios inmutable

```sql
create table change_log (
  id             bigint generated always as identity primary key,
  project_id     uuid not null,
  tabla          text not null,
  registro_id    uuid not null,
  operacion      text not null check (operacion in ('INSERT','UPDATE','DELETE')),
  valor_anterior jsonb,
  valor_nuevo    jsonb,
  changed_by     uuid,
  changed_at     timestamptz not null default now(),
  hash_anterior  text,
  hash           text not null
);

create or replace function audit_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := coalesce(auth.uid(),
                  nullif(current_setting('app.current_user_id', true), '')::uuid);
  v_old jsonb := case when TG_OP <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when TG_OP <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_prev text;
begin
  select hash into v_prev from change_log order by id desc limit 1;
  insert into change_log (project_id, tabla, registro_id, operacion,
                          valor_anterior, valor_nuevo, changed_by, hash_anterior, hash)
  values ((v_row->>'project_id')::uuid, TG_TABLE_NAME, (v_row->>'id')::uuid, TG_OP,
          v_old, v_new, v_user, v_prev,
          encode(sha256(convert_to(coalesce(v_prev,'') || coalesce(v_old::text,'')
                 || coalesce(v_new::text,'') || now()::text, 'UTF8')), 'hex'));
  return coalesce(new, old);
end $$;

create trigger trg_audit_requirements after insert or update or delete on requirements
  for each row execute function audit_changes();
create trigger trg_audit_specs after insert or update or delete on requirement_specs
  for each row execute function audit_changes();

create or replace function bloquear_modificacion() returns trigger
language plpgsql as $$ begin raise exception 'change_log es de solo inserción'; end $$;
create trigger trg_change_log_inmutable before update or delete on change_log
  for each row execute function bloquear_modificacion();

revoke update, delete, truncate on change_log from anon, authenticated;
```

> **Importante:** `auth.uid()` solo tiene valor cuando la petición llega a PostgreSQL con el JWT del usuario. Si la API usa la llave `service_role`, `auth.uid()` es nulo y la auditoría queda sin autor. La solución recomendada es crear en la API un cliente de Supabase por petición con el token del usuario (lo que además activa RLS, ver Spec 7). La variable `app.current_user_id` queda solo como respaldo para procesos internos que se ejecuten dentro de una función RPC.

El encadenamiento por hash permite detectar si alguien con privilegios de superusuario alteró registros: basta con recalcular la cadena y compararla. Para una garantía más fuerte, se puede exportar periódicamente el último hash a un almacenamiento externo.

### Backend

| Método | Ruta | Rol permitido | Descripción |
|---|---|---|---|
| GET | /api/v1/projects/:projectId/traceability?direction=forward\|backward | Miembros | Matriz paginada; filtros por objetivo, requisito, tipo y estado. |
| GET | /api/v1/projects/:projectId/traceability/gaps | Miembros | Objetivos sin requisitos, requisitos sin ficha, requisitos sin artefacto de prueba, KPI sin fuente de datos. |
| POST | /api/v1/requirements/:reqId/artifacts | lider_tecnico, cientifico_datos | Vincula un artefacto técnico. |
| GET | /api/v1/requirements/:reqId/history | Miembros | Historial desde `change_log`. |
| GET | /api/v1/projects/:projectId/change-log/verify | lider_tecnico | Verifica la integridad de la cadena de hash. |

### Frontend

- `TraceabilityDataGrid.vue` con `ag-grid-vue3`: la virtualización de filas está incluida en la edición Community. El modelo de filas del lado del servidor (Server-Side Row Model) es de la edición Enterprise, que requiere licencia; con la edición Community se usa paginación en servidor o el modelo de filas infinito.
- Resaltado visual de brechas (celdas vacías en color de alerta) y exportación a CSV/Excel para anexos del estudio de caso.
- `RequirementHistoryTimeline.vue`: línea de tiempo con el valor anterior y el nuevo, autor y fecha.

### Criterios de aceptación

- Toda edición o eliminación de un requisito genera exactamente un registro en `change_log` con el ID del usuario que la hizo (nunca nulo en operaciones desde la API).
- Un usuario autenticado no puede actualizar ni borrar registros de `change_log`, ni por la API ni con el cliente de Supabase.
- El endpoint de brechas lista un requisito aprobado que no tiene artefacto de tipo prueba.
- La matriz responde en menos de 2 s con 5.000 filas paginadas.

**Rama Git:** `feature/matriz-trazabilidad-inmutable`.

---

[← Spec 4](spec-04-fichas-ctq-kpi.md) · [Índice](README.md) · [Spec 6 →](spec-06-motor-estados-gates.md)
