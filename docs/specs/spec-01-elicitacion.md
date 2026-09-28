# Spec 1: Módulo de Elicitación y Mapeo Sociotécnico (Fase 1)

| Campo | Valor |
|---|---|
| Fase del marco | Fase 1: Elicitación |
| Depende de | Spec 0, Spec 7, Spec 8 |
| Rama Git | `feature/modulo-elicitacion-stakeholders` |
| Estado | Pendiente |

**Descripción:** captura de la Voz del Cliente (VOC), registro de sesiones de elicitación, definición del caso de negocio y mapeo de stakeholders mediante el Modelo de Saliencia.

**Relación con el marco:** la Fase 1 exige documentar nombre y rol del stakeholder, necesidad expresada en lenguaje de negocio, objetivo de negocio asociado, restricciones (tiempo, presupuesto, regulación) y fuentes de datos mencionadas; y producir acta de elicitación, ficha de caso de negocio y mapa de stakeholders.

### Cambios respecto a la versión 1.0

- Se añaden las tablas de sesiones de elicitación (acta) y de entradas VOC, que antes no existían: la spec se llamaba "Voz del Cliente" pero no la almacenaba.
- `business_cases` ahora pertenece a un proyecto (faltaba `project_id`) y sus restricciones tienen estructura validada.
- El gráfico se corrige a poder vs. legitimidad, con el tamaño de la burbuja según urgencia; se calcula la clase de saliencia.
- La protección contra XSS se reformula: la defensa principal es la codificación en la salida, no solo la sanitización de entrada.

### Fundamento: Modelo de Saliencia

El modelo de saliencia de stakeholders (Mitchell, Agle y Wood, 1997, retomado por Jensen y Kadenic, 2024) clasifica a cada actor según la posesión de tres atributos: poder, legitimidad y urgencia. Como la spec usa escalas de 1 a 5, se considera que un atributo está presente cuando su valor es mayor o igual a 3 (umbral documentado y ajustable). La combinación produce siete clases:

| Atributos presentes | Clase | Grupo |
|---|---|---|
| Solo poder | Latente inactivo (dormant) | Latentes |
| Solo legitimidad | Latente discrecional | Latentes |
| Solo urgencia | Latente exigente | Latentes |
| Poder + legitimidad | Dominante | Expectantes |
| Poder + urgencia | Peligroso | Expectantes |
| Legitimidad + urgencia | Dependiente | Expectantes |
| Los tres atributos | Definitivo | Definitivos |

> **Nota para el documento del marco:** la Fase 1 del artículo describe el modelo de saliencia como "nivel de influencia e interés". Conviene ajustarlo a poder, legitimidad y urgencia, y citar a Mitchell et al. (1997) como fuente original, para que el texto y la herramienta sean coherentes.

### Modelo de datos

```sql
create type tipo_stakeholder as enum ('negocio','tecnico','usuario_final','regulador');
create type tipo_sesion      as enum ('entrevista','taller_voc','observacion','grupo_focal');

create table stakeholders (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  user_id      uuid references auth.users(id),     -- si tiene cuenta (necesario para firmar gates)
  nombre       varchar(150) not null,
  rol_negocio  varchar(100) not null,
  area         varchar(100),
  tipo         tipo_stakeholder not null,
  poder        smallint not null check (poder between 1 and 5),
  legitimidad  smallint not null check (legitimidad between 1 and 5),
  urgencia     smallint not null check (urgencia between 1 and 5),
  clase_saliencia text generated always as (
    case
      when poder>=3 and legitimidad>=3 and urgencia>=3 then 'definitivo'
      when poder>=3 and legitimidad>=3 then 'dominante'
      when poder>=3 and urgencia>=3    then 'peligroso'
      when legitimidad>=3 and urgencia>=3 then 'dependiente'
      when poder>=3       then 'latente_inactivo'
      when legitimidad>=3 then 'latente_discrecional'
      when urgencia>=3    then 'latente_exigente'
      else 'no_stakeholder'
    end) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table elicitation_sessions (             -- acta de reunión de elicitación
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  fecha          timestamptz not null,
  tipo           tipo_sesion not null,
  facilitador_id uuid not null references auth.users(id),
  resumen        text not null,
  acuerdos       text,
  created_at     timestamptz not null default now()
);

create table session_participants (
  session_id     uuid references elicitation_sessions(id) on delete cascade,
  stakeholder_id uuid references stakeholders(id) on delete cascade,
  primary key (session_id, stakeholder_id)
);

create table voc_entries (                      -- voz del cliente
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  session_id          uuid references elicitation_sessions(id),
  stakeholder_id      uuid not null references stakeholders(id),
  necesidad_expresada text not null check (char_length(necesidad_expresada) <= 2000),
  objetivo_id         uuid references business_objectives(id),
  created_at          timestamptz not null default now()
);

create table voc_data_sources (                 -- fuentes de datos mencionadas
  voc_id         uuid references voc_entries(id) on delete cascade,
  data_source_id uuid references data_sources(id) on delete cascade,
  primary key (voc_id, data_source_id)
);

create table business_cases (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null unique references projects(id) on delete cascade,
  necesidad_negocio text not null,
  beneficio_esperado text,
  restricciones     jsonb not null default '{}'::jsonb,
  version           int not null default 1,
  updated_at        timestamptz not null default now()
);

alter table requirements add column origen_voc_id uuid references voc_entries(id);
```

Estructura esperada de `restricciones` (validada con Zod en la API):

```json
{
  "tiempo":      { "fecha_limite": "2026-12-15", "descripcion": "Cierre fiscal" },
  "presupuesto": { "monto": 25000000, "moneda": "COP" },
  "regulacion":  ["Ley 1581 de 2012 (protección de datos personales)"],
  "otras":       ["Solo datos anonimizados en ambiente de desarrollo"]
}
```

### Backend (Node.js / Express)

| Método | Ruta | Rol permitido | Descripción |
|---|---|---|---|
| POST | /api/v1/projects/:projectId/stakeholders | lider_tecnico, analista_requisitos | Crea stakeholder; valida saliencia 1–5. |
| GET | /api/v1/projects/:projectId/stakeholders | Miembros | Lista con `clase_saliencia` calculada. |
| PATCH / DELETE | /api/v1/projects/:projectId/stakeholders/:id | lider_tecnico, analista_requisitos | Actualiza o elimina. |
| POST | /api/v1/projects/:projectId/elicitation-sessions | lider_tecnico, analista_requisitos | Registra acta con participantes. |
| POST | /api/v1/projects/:projectId/voc-entries | Miembros (excepto solo lectura) | Registra necesidad expresada y fuentes mencionadas. |
| PUT | /api/v1/projects/:projectId/business-case | lider_tecnico, analista_requisitos | Crea o versiona la ficha de caso de negocio. |
| GET | /api/v1/projects/:projectId/salience-map | Miembros | Datos listos para el gráfico de burbujas. |

Esquema de validación (Zod):

```js
import { z } from 'zod';

const escala = z.number().int().min(1).max(5);
const textoPlano = (max) => z.string().trim().min(1).max(max)
  .refine(v => !/[<>]/.test(v), 'No se permiten etiquetas HTML');

export const stakeholderSchema = z.object({
  nombre:      textoPlano(150),
  rol_negocio: textoPlano(100),
  area:        textoPlano(100).optional(),
  tipo:        z.enum(['negocio', 'tecnico', 'usuario_final', 'regulador']),
  poder:       escala,
  legitimidad: escala,
  urgencia:    escala,
  user_id:     z.string().uuid().optional(),
}).strict();   // rechaza campos no declarados
```

### Frontend (Vue 3)

- `StakeholderForm.vue`: validación reactiva con el mismo esquema Zod compartido (paquete común o `vee-validate` + `@vee-validate/zod`), sliders 1–5 con descripción de cada nivel.
- `SalienceMatrixChart.vue`: gráfico de burbujas (vue-echarts o Chart.js). Eje X = poder, eje Y = legitimidad, radio = urgencia, color = clase de saliencia; líneas de referencia en el umbral 3 para visualizar los cuadrantes.
- `ElicitationSessionForm.vue` (acta) y `VocCaptureForm.vue`: permiten registrar varias necesidades por sesión y vincularlas a stakeholders, objetivos y fuentes de datos.
- `BusinessCaseEditor.vue`: ficha de caso de negocio con historial de versiones.

### Seguridad

- Defensa principal contra XSS: codificación en la salida. Vue escapa por defecto las interpolaciones `{{ }}`; está prohibido usar `v-html` con contenido de usuario (regla de ESLint `vue/no-v-html`).
- Defensa complementaria en la entrada: longitudes máximas, esquemas `.strict()` y rechazo de etiquetas en campos de texto plano. Si en el futuro se admite texto enriquecido, sanitizar con DOMPurify en el cliente y `sanitize-html` en el servidor.
- La VOC puede contener datos personales: aplicar minimización y acceso restringido por proyecto (Spec 7), en línea con la Ley 1581 de 2012.

### Criterios de aceptación

- Enviar `poder: 6` devuelve 400 con el detalle del campo; la base de datos también lo rechaza si se inserta directamente.
- Un stakeholder con valores (4, 4, 4) aparece como "definitivo" en la tabla y en el gráfico.
- El texto `<script>alert(1)</script>` es rechazado en campos de texto plano; si llegara a existir en la base, se muestra literal y no se ejecuta.
- Un usuario que no es miembro del proyecto recibe 404 al consultar sus stakeholders.

**Rama Git:** `feature/modulo-elicitacion-stakeholders`.

---

[← Spec 0](spec-00-nucleo.md) · [Índice](README.md) · [Spec 2 →](spec-02-kano.md)
