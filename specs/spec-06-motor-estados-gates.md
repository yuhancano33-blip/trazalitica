# Spec 6: Motor de Estados y Gates de Validación (Fase 4)

| Campo | Valor |
|---|---|
| Fase del marco | Fase 4: Validación y Trazabilidad |
| Depende de | Spec 0, Spec 1, Spec 4, Spec 5 |
| Rama Git | `feature/motor-estados-gates` |
| Estado | Pendiente |

**Descripción:** control del flujo metodológico del proyecto que impide avanzar de fase sin la validación de los stakeholders, registra aprobaciones y rechazos con observaciones, y permite retroceder de fase cuando la validación evidencia desalineación.

**Relación con el marco:** la Fase 4 exige validación obligatoria mediante un gate inspirado en MANDALA.ML (Reiche y Leidner, 2025), documentar resultado (aprobado o rechazado), observaciones y cambios solicitados, y producir el acta de validación. El marco es secuencial pero iterativo: si la validación detecta desalineación, el equipo puede volver a la Fase 1 o 2.

### Cambios respecto a la versión 1.0

- Un único campo `aprobado_por` no soporta varios aprobadores, ni rechazos, ni observaciones. Se reemplaza por gates con aprobaciones individuales.
- Se permite el retroceso de fase, que el marco exige y la versión 1.0 no contemplaba.
- Se añaden criterios de salida automáticos por fase (checklist verificable por el sistema).
- Se corrige el código HTTP: 403 se reserva para falta de permisos por rol; un gate no aprobado responde 409.
- Se precisa el concepto: un PIN o una reautenticación constituyen una firma electrónica simple, no una firma digital con certificado.

### Máquina de estados

| Transición | Tipo | Condición (guarda) |
|---|---|---|
| elicitacion → analisis | Avance | Gate de Fase 1 aprobado y criterios de salida cumplidos. |
| analisis → especificacion | Avance | Gate de Fase 2 aprobado y criterios de salida cumplidos. |
| especificacion → validacion | Avance | Gate de Fase 3 aprobado y criterios de salida cumplidos. |
| validacion → cerrado | Cierre | Gate de Fase 4 aprobado y sin brechas de trazabilidad. |
| Cualquier fase → fase anterior | Retroceso | Motivo obligatorio; lo ejecuta el líder técnico; incrementa la iteración y queda en `change_log`. |

### Criterios de salida por fase (verificados por el sistema)

| Fase | Criterios mínimos |
|---|---|
| Elicitación | Caso de negocio registrado; al menos un objetivo de negocio; al menos un stakeholder definitivo o dominante; al menos una sesión de elicitación con acta; toda entrada VOC vinculada a un objetivo. |
| Análisis y Priorización | Todo requisito activo con tipo, categoría Kano y factibilidad; al menos un diagrama DAPS por objetivo; dependencias sin ciclos. |
| Especificación | Todo requisito priorizado (M, O o A) con ficha vigente, criterio de aceptación y KPI o CTQ. |
| Validación y Trazabilidad | Sin brechas críticas en la matriz; todas las observaciones del gate anterior atendidas. |

### Modelo de datos

```sql
create type estado_gate as enum ('abierto','en_revision','aprobado','rechazado');
create type decision_gate as enum ('aprobado','rechazado');
create type tipo_observacion as enum ('ambiguedad','omision','inconsistencia','cambio_alcance','otra');

create table phase_gates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  fase        fase_marco not null,
  iteracion   int not null,
  estado      estado_gate not null default 'abierto',
  abierto_at  timestamptz not null default now(),
  cerrado_at  timestamptz,
  unique (project_id, fase, iteracion)
);

create table gate_required_approvers (
  gate_id uuid references phase_gates(id) on delete cascade,
  user_id uuid references auth.users(id),
  primary key (gate_id, user_id)
);

create table gate_approvals (
  id                   uuid primary key default gen_random_uuid(),
  gate_id              uuid not null references phase_gates(id) on delete cascade,
  user_id              uuid not null references auth.users(id),
  decision             decision_gate not null,
  observaciones        text,
  snapshot_hash        text not null,   -- SHA-256 del contenido validado
  metodo_verificacion  text not null,   -- 'reautenticacion' | 'otp' | 'mfa'
  ip                   inet,
  user_agent           text,
  firmado_at           timestamptz not null default now(),
  unique (gate_id, user_id)
);

create table gate_observations (
  id          uuid primary key default gen_random_uuid(),
  approval_id uuid not null references gate_approvals(id) on delete cascade,
  tipo        tipo_observacion not null,
  requirement_id uuid references requirements(id),
  descripcion text not null,
  atendida    boolean not null default false
);
```

Por defecto, los aprobadores requeridos de un gate son los usuarios vinculados a stakeholders de clase "definitivo" (Spec 1), lo que conecta el modelo de saliencia con la validación; el líder técnico puede ajustar la lista. El gate queda aprobado solo cuando todos los aprobadores requeridos aprueban; basta un rechazo para que quede rechazado.

El `snapshot_hash` se calcula sobre el contenido exacto de los artefactos presentados (fichas, matriz, diagrama). Si después de la aprobación alguien modifica esos artefactos, el hash deja de coincidir y el sistema lo señala: así se demuestra qué versión aprobó cada stakeholder.

### Backend (patrón State Machine)

| Método | Ruta | Rol permitido | Descripción |
|---|---|---|---|
| POST | /api/v1/projects/:projectId/transition-phase | lider_tecnico | Cuerpo `{ destino, motivo? }`. 200 si procede; 409 si el gate no está aprobado o faltan criterios (lista de pendientes en `details`); 422 si la transición no existe. |
| GET | /api/v1/projects/:projectId/gates/current | Miembros | Estado del gate, checklist y aprobaciones. |
| POST | /api/v1/gates/:gateId/submit | lider_tecnico | Pasa el gate a revisión y congela el snapshot. |
| POST | /api/v1/gates/:gateId/approvals | Aprobador requerido | Decisión con observaciones; exige token de reautenticación reciente. |
| GET | /api/v1/gates/:gateId/acta | Miembros | Genera el acta de validación en PDF. |

La transición se ejecuta en una función PostgreSQL que bloquea la fila del proyecto (`select ... for update`) para evitar que dos transiciones simultáneas dejen el proyecto en un estado inconsistente. Se recomienda implementar la máquina de estados con una tabla de transiciones explícita (o una librería como XState) y probar cada transición con pruebas unitarias.

### Firma electrónica del stakeholder

- Antes de aprobar, el usuario se reautentica (contraseña o código OTP de un solo uso) y la API emite un token de firma de corta vida (5 minutos) válido solo para ese gate.
- Si se opta por PIN, se almacena con hash (Argon2id o bcrypt), con bloqueo tras 5 intentos fallidos.
- Recomendado: exigir MFA (TOTP, soportado por Supabase Auth) a los usuarios que firman gates.
- Si las actas deben tener valor probatorio ante terceros, revisar los requisitos de la Ley 527 de 1999 y el Decreto 2364 de 2012 sobre firma electrónica en Colombia.

### Frontend

- `ValidationGatekeeper.vue`: checklist de criterios (cumplido / pendiente), enlaces a los artefactos, decisión aprobar/rechazar, observaciones tipificadas y modal de reautenticación.
- `PhaseStepper.vue`: fase actual, iteración e historial de gates; botón de retroceso con motivo obligatorio (visible solo para el líder técnico).

### Criterios de aceptación

- Intentar avanzar con el gate abierto devuelve 409 con la lista de criterios pendientes.
- Un científico de datos que invoca la transición recibe 403.
- Un rechazo con observaciones deja el gate en "rechazado" y permite retroceder a Elicitación o Análisis, incrementando la iteración.
- Modificar una ficha después de aprobada hace que el gate muestre la alerta de snapshot desactualizado.

**Rama Git:** `feature/motor-estados-gates`.

---

[← Spec 5](spec-05-trazabilidad-change-log.md) · [Índice](README.md) · [Spec 7 →](spec-07-seguridad-rls.md)
