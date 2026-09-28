import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  // Vite incluye en el bundle del navegador toda variable con prefijo VITE_.
  // Un secreto con ese prefijo quedaría público: se aborta el arranque (Spec 7).
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const filtradas = Object.keys(env).filter((k) => /SERVICE_ROLE|SECRET/i.test(k));
  if (filtradas.length > 0) {
    throw new Error(`Variables prohibidas en el frontend: ${filtradas.join(', ')}`);
  }

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: { '/api': 'http://localhost:3000' },
    },
    build: {
      sourcemap: false,
    },
  };
});
