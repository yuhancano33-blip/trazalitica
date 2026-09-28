// Datos FICTICIOS para desarrollo local: un usuario por rol y un proyecto de ejemplo.
// Uso: npm run seed:dev   (requiere `npm run db:start` y .env con SUPABASE_SERVICE_ROLE_KEY local)
//
// Reglas:
//   * Nunca datos reales: correos en el dominio reservado example.test.
//   * Solo se ejecuta contra Supabase local; se niega a correr contra un proyecto remoto.
//   * Es idempotente: se puede ejecutar varias veces.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  console.error(`seed-dev solo se ejecuta contra Supabase local; SUPABASE_URL=${url}`);
  process.exit(1);
}
if (!serviceKey) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY (valor local de `npx supabase status`).');
  process.exit(1);
}

// service_role solo aquí: tarea administrativa local, nunca en la API ni en el frontend.
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const PASSWORD = 'Desarrollo2026';
const USUARIOS = [
  { email: 'lider@example.test', nombre: 'Laura Líder (ficticia)', rol: 'lider_tecnico' },
  {
    email: 'analista@example.test',
    nombre: 'Andrés Analista (ficticio)',
    rol: 'analista_requisitos',
  },
  {
    email: 'cientifica@example.test',
    nombre: 'Carla Científica (ficticia)',
    rol: 'cientifico_datos',
  },
  {
    email: 'stakeholder@example.test',
    nombre: 'Sergio Stakeholder (ficticio)',
    rol: 'stakeholder_negocio',
  },
];

async function asegurarUsuario({ email, nombre }) {
  const { data: lista, error: errLista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (errLista) throw errLista;
  const existente = lista.users.find((u) => u.email === email);
  if (existente) return existente;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { nombre }, // solo presentación; los roles NUNCA van aquí (Spec 8)
  });
  if (error) throw error;
  return data.user;
}

function tablaNoExiste(error) {
  return error && (error.code === '42P01' || error.code === 'PGRST205');
}

async function sembrarProyecto(usuarios) {
  const lider = usuarios.find((u) => u.rol === 'lider_tecnico');
  const nombre = 'Proyecto de ejemplo — ventas ficticias';

  const { data: existente, error: errBusca } = await admin
    .from('projects')
    .select('id')
    .eq('nombre', nombre)
    .maybeSingle();
  if (tablaNoExiste(errBusca)) {
    console.log('La tabla projects aún no existe (Spec 0 pendiente): solo se crearon usuarios.');
    return;
  }
  if (errBusca) throw errBusca;

  let projectId = existente?.id;
  if (!projectId) {
    const { data, error } = await admin
      .from('projects')
      .insert({ nombre, descripcion: 'Datos inventados para desarrollo', created_by: lider.id })
      .select('id')
      .single();
    if (error) throw error;
    projectId = data.id;
  }

  const miembros = usuarios.map((u) => ({ project_id: projectId, user_id: u.id, rol: u.rol }));
  const { error } = await admin
    .from('project_members')
    .upsert(miembros, { onConflict: 'project_id,user_id' });
  if (error) throw error;

  console.log(`Proyecto de ejemplo listo: ${projectId}`);
}

const usuarios = [];
for (const u of USUARIOS) {
  const creado = await asegurarUsuario(u);
  usuarios.push({ ...u, id: creado.id });
  console.log(`Usuario ${u.email} (${u.rol})`);
}
await sembrarProyecto(usuarios);
console.log(`Contraseña de todos los usuarios ficticios: ${PASSWORD}`);
