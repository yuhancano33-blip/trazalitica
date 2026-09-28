// Verifica la conexión con Supabase usando las variables de .env, sin imprimir ninguna llave.
// Uso: npm run check:supabase
//
// Comprueba:
//   1. Que las variables existen (solo informa "presente" / "falta").
//   2. Que la URL tiene el formato de un proyecto de Supabase.
//   3. Que la llave pública NO es una llave de servicio (Spec 7).
//   4. Que el servidor de Auth responde y acepta la llave pública.

const VARIABLES = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'ALLOWED_ORIGINS',
  'PORT',
];

let fallos = 0;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const mal = (msg) => {
  fallos += 1;
  console.log(`  ✘ ${msg}`);
};

console.log('1. Variables de entorno');
for (const nombre of VARIABLES) {
  if (process.env[nombre]) ok(`${nombre}: presente`);
  else mal(`${nombre}: falta`);
}
if (process.env.VITE_SUPABASE_URL !== process.env.SUPABASE_URL) {
  mal('VITE_SUPABASE_URL y SUPABASE_URL tienen valores distintos');
}
if (process.env.VITE_SUPABASE_ANON_KEY !== process.env.SUPABASE_ANON_KEY) {
  mal('VITE_SUPABASE_ANON_KEY y SUPABASE_ANON_KEY tienen valores distintos');
}

const url = process.env.SUPABASE_URL ?? '';
const llave = process.env.SUPABASE_ANON_KEY ?? '';

console.log('2. Formato de la URL');
const esRemota = /^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(url);
const esLocal = /^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url);
if (esRemota) ok('URL de proyecto de Supabase (https://<ref>.supabase.co)');
else if (esLocal) ok('URL de Supabase local');
else mal('La URL no tiene el formato https://<ref>.supabase.co');

console.log('3. Tipo de llave pública');
function rolDeJwt(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role;
  } catch {
    return null;
  }
}
if (!llave) {
  mal('Sin llave pública que revisar');
} else if (llave.startsWith('sb_secret_') || rolDeJwt(llave) === 'service_role') {
  mal('La llave pública es una llave de SERVICIO: nunca debe ir en VITE_ ni en SUPABASE_ANON_KEY');
} else if (llave.startsWith('sb_publishable_')) {
  ok('Publishable key');
} else if (rolDeJwt(llave) === 'anon') {
  ok('Llave anon (formato JWT heredado)');
} else {
  mal('Formato de llave no reconocido');
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('   (SUPABASE_SERVICE_ROLE_KEY: presente; no se usa en esta prueba)');
}

console.log('4. Conexión con Supabase Auth');
if (fallos > 0 || (!esRemota && !esLocal)) {
  console.log('  – Omitida: corrige primero los puntos anteriores');
} else {
  try {
    const base = url.replace(/\/$/, '');
    const res = await fetch(`${base}/auth/v1/settings`, {
      headers: { apikey: llave },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) ok(`Auth respondió ${res.status}: la URL y la llave son válidas`);
    else if (res.status === 401) mal('Auth respondió 401: la llave no corresponde a este proyecto');
    else mal(`Auth respondió ${res.status}`);
  } catch (e) {
    mal(
      `No hubo conexión (${e.name === 'TimeoutError' ? 'tiempo agotado' : (e.cause?.code ?? e.name)})`,
    );
  }
}

console.log(
  fallos === 0 ? '\nConexión con Supabase verificada.' : `\n${fallos} problema(s) encontrado(s).`,
);
process.exit(fallos === 0 ? 0 : 1);
