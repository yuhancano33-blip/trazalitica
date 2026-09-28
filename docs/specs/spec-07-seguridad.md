# Spec 7: Aislamiento de Infraestructura y RLS (Seguridad Transversal)

| Campo | Valor |
|---|---|
| Fase del marco | Seguridad transversal |
| Depende de | Spec 0, Spec 8 |
| Rama Git | `chore/configuracion-seguridad-rls` |
| Estado | Pendiente |

**Descripción:** prevención de accesos no autorizados a nivel de base de datos, API y despliegue.

### Cambios respecto a la versión 1.0

- Las políticas cubren SELECT, INSERT, UPDATE y DELETE; con solo SELECT, las escrituras quedaban bloqueadas o desprotegidas según la configuración.
- Se centraliza la verificación de membresía en una función para simplificar políticas y mejorar el rendimiento.
- Se documenta que la llave `service_role` omite RLS y cómo evitar que el backend la use para peticiones de usuario.
- Se corrige la limitación de peticiones para un entorno serverless.

### Row Level Security

```sql
create or replace function is_project_member(p_project uuid, p_roles rol_proyecto[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from project_members m
    where m.project_id = p_project
      and m.user_id = (select auth.uid())
      and (p_roles is null or m.rol = any(p_roles)));
$$;

alter table requirements enable row level security;

create policy "req_select_miembros" on requirements for select to authenticated
  using (is_project_member(project_id));

create policy "req_insert_editores" on requirements for insert to authenticated
  with check (is_project_member(project_id,
    array['lider_tecnico','analista_requisitos','cientifico_datos']::rol_proyecto[]));

create policy "req_update_editores" on requirements for update to authenticated
  using (is_project_member(project_id,
    array['lider_tecnico','analista_requisitos','cientifico_datos']::rol_proyecto[]))
  with check (is_project_member(project_id,
    array['lider_tecnico','analista_requisitos','cientifico_datos']::rol_proyecto[]));

create policy "req_delete_lider" on requirements for delete to authenticated
  using (is_project_member(project_id, array['lider_tecnico']::rol_proyecto[]));

-- change_log: solo lectura para miembros; sin políticas de escritura
alter table change_log enable row level security;
create policy "log_select_miembros" on change_log for select to authenticated
  using (is_project_member(project_id));
```

- Se aplica el mismo patrón a todas las tablas con `project_id`. Una prueba automatizada en CI consulta `pg_tables` y falla si alguna tabla del esquema `public` no tiene RLS habilitado.
- Pruebas de políticas con pgTAP o con scripts que se autentican como usuarios de distintos proyectos y roles.

> **Crítico:** la llave `service_role` omite todas las políticas RLS. Para que RLS realmente evite la exfiltración "si un endpoint es comprometido", la API debe crear en cada petición un cliente de Supabase con la llave anónima y el JWT del usuario (`global.headers.Authorization`). La llave `service_role` se reserva para tareas administrativas puntuales, nunca se expone al frontend y nunca se declara con prefijo `VITE_`, porque Vite incluye esas variables en el paquete del navegador.

### Cabeceras de seguridad (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://<proyecto>.supabase.co wss://<proyecto>.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

`style-src 'unsafe-inline'` es necesario porque Vue Flow y AG Grid aplican estilos en línea para posicionar elementos. Antes de producción conviene probar la política en modo `Content-Security-Policy-Report-Only` para detectar bloqueos.

### Backend

- `helmet()` con la configuración por defecto para las respuestas de la API.
- `cors` con lista explícita de orígenes permitidos (dominio de producción y de vista previa), `credentials: true` y sin comodín `*`.
- `express-rate-limit` con almacén compartido (por ejemplo, Redis gestionado mediante `rate-limit-redis`), porque en Vercel cada invocación puede ejecutarse en una instancia distinta y un contador en memoria no se comparte. Límite general (p. ej., 300 peticiones por 15 minutos por usuario) y límite estricto para autenticación y firma (p. ej., 5 intentos por 15 minutos).
- `express.json({ limit: '1mb' })` en general y un límite mayor solo en la ruta de sincronización DAPS.
- La limitación de peticiones mitiga fuerza bruta y abuso de la API, pero no un ataque DDoS volumétrico; para eso se usan las protecciones de red de Vercel (firewall y modo de desafío ante ataques).
- Registro estructurado (pino) sin tokens ni datos personales; `npm audit` y Dependabot en CI.

### Criterios de aceptación

- Un usuario autenticado del proyecto A no puede leer, crear, modificar ni borrar datos del proyecto B, ni por la API ni con el cliente de Supabase directamente.
- El análisis de las cabeceras en producción (por ejemplo, con securityheaders.com) obtiene calificación A o superior.
- El sexto intento de inicio de sesión fallido en 15 minutos recibe 429.
- Buscar la llave `service_role` en el paquete JavaScript desplegado no produce resultados.

**Rama Git:** `chore/configuracion-seguridad-rls`.

---

[← Spec 6](spec-06-gates.md) · [Índice](README.md) · [Spec 8 →](spec-08-autenticacion.md)
