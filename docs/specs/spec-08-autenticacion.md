# Spec 8: Autenticación JWT y Control de Acceso Basado en Roles (Seguridad Transversal)

| Campo | Valor |
|---|---|
| Fase del marco | Seguridad transversal |
| Depende de | Spec 0 |
| Rama Git | `feature/autenticacion-rbac-jwt` |
| Estado | Pendiente |

**Descripción:** autenticación con Supabase Auth y control de acceso por rol dentro de cada proyecto para proteger las operaciones sensibles del marco.

### Cambios respecto a la versión 1.0

- Los roles dejan de guardarse en `user_metadata`: en Supabase ese campo puede modificarlo el propio usuario desde el cliente, lo que permitiría que cualquiera se asigne el rol de líder técnico.
- Los roles pasan a ser por proyecto (`project_members.rol`), porque una misma persona puede ser stakeholder en un proyecto y científico de datos en otro.
- Se agrega el rol `analista_requisitos`, coherente con las actividades de elicitación y especificación del marco.
- Se aclara cómo lograr refresh tokens en cookies HttpOnly, ya que supabase-js guarda la sesión en localStorage por defecto.

### Matriz de permisos

| Acción | stakeholder_negocio | analista_requisitos | cientifico_datos | lider_tecnico |
|---|---|---|---|---|
| Ver artefactos del proyecto | Sí | Sí | Sí | Sí |
| Registrar VOC y responder Kano | Sí | Sí | Sí | Sí |
| Gestionar stakeholders y actas | No | Sí | No | Sí |
| Crear y editar requisitos y fichas | No | Sí | Sí | Sí |
| Evaluar factibilidad y vincular artefactos | No | No | Sí | Sí |
| Aprobar o rechazar gates | Sí (si es aprobador requerido) | No | No | No |
| Transición o retroceso de fase | No | No | No | Sí |
| Gestionar miembros y eliminar | No | No | No | Sí |

El líder técnico no aprueba los gates para preservar la separación de funciones: quien presenta el trabajo no es quien lo valida.

### Backend

```js
// Verifica el JWT y crea un cliente de Supabase con la identidad del usuario
export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: { code: 'NO_TOKEN' } });
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: { code: 'INVALID_TOKEN' } });
  req.user = data.user;
  req.supabase = supabase;          // todas las consultas pasan por RLS
  next();
}

// Autoriza según el rol del usuario en el proyecto de la ruta
export const requireProjectRole = (roles) => async (req, res, next) => {
  const { data } = await req.supabase.from('project_members')
    .select('rol').eq('project_id', req.params.projectId)
    .eq('user_id', req.user.id).maybeSingle();
  if (!data) return res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND' } });
  if (!roles.includes(data.rol)) return res.status(403).json({ error: { code: 'FORBIDDEN' } });
  req.projectRole = data.rol;
  next();
};

router.post('/projects/:projectId/transition-phase',
  authenticate, requireProjectRole(['lider_tecnico']), transitionPhase);
```

Como alternativa a `getUser` (que consulta al servidor de autenticación), la firma del JWT puede verificarse localmente con la librería `jose` y las llaves públicas (JWKS) del proyecto, si este usa llaves de firma asimétricas. Para rutas sin `:projectId` en la URL (por ejemplo, `/requirements/:reqId`), el middleware obtiene primero el `project_id` del recurso.

### Manejo de sesión y refresh tokens

- Opción recomendada: la API actúa como intermediario de autenticación (`/api/v1/auth/login`, `/refresh`, `/logout`). El refresh token se guarda en una cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`; el access token vive solo en memoria (Pinia sin persistencia) y dura poco.
- Alternativa: `@supabase/ssr`, que gestiona la sesión mediante cookies.
- Protección CSRF: `SameSite=Strict` y verificación de una cabecera personalizada (o token doble) en `/refresh` y `/logout`.
- El cliente renueva el access token ante un 401 con un interceptor que evita peticiones de renovación simultáneas.
- Si se requiere un rol global (por ejemplo, administrador de la plataforma), se guarda en `app_metadata` o se inyecta en el token mediante un Custom Access Token Hook de Supabase; ambos solo son modificables desde el servidor.

### Frontend

```js
// router/index.js
{ path: '/proyectos/:projectId/validar-gates',
  component: () => import('@/views/ValidarGatesView.vue'),
  meta: { requiresAuth: true, roles: ['stakeholder_negocio', 'lider_tecnico'] } },
{ path: '/acceso-denegado', component: () => import('@/views/AccesoDenegado.vue') },

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { path: '/login', query: { next: to.fullPath } };
  if (to.meta.roles) {
    const rol = await auth.getProjectRole(to.params.projectId);
    if (!to.meta.roles.includes(rol)) return { path: '/acceso-denegado' };
  }
});
```

Los guards de navegación mejoran la experiencia, pero no son un control de seguridad: cualquier usuario puede manipular el código del navegador. La autorización efectiva la hacen siempre la API y RLS.

### Criterios de aceptación

- Un usuario que modifica su `user_metadata` desde la consola del navegador no obtiene ningún permiso adicional.
- El refresh token no es accesible desde `document.cookie` ni desde localStorage.
- Un científico de datos que navega a `/proyectos/:id/validar-gates` es redirigido a "Acceso denegado", y si llama al endpoint directamente recibe 403.

**Rama Git:** `feature/autenticacion-rbac-jwt`.

---

[← Spec 7](spec-07-seguridad.md) · [Índice](README.md) · [Spec 9 →](spec-09-metricas.md)
