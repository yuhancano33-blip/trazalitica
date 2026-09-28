---
description: Crea un componente Vue 3 (<script setup>) en la carpeta de su fase del marco
argument-hint: <NombreComponente> [spec N]
---

Crea el componente Vue: $ARGUMENTS

Sigue la skill `.agents/skills/componente-vue-fase/SKILL.md` y las reglas de `.continue/rules/05-frontend-vue.md`.

1. Busca el componente en la sección "Frontend" de la spec para conocer su propósito y qué datos muestra o captura.
2. Ubícalo según la fase: `nucleo` (Spec 0), `elicitacion` (1), `analisis` (2, 3), `especificacion` (4), `validacion` (5, 6), `metricas` (9), `auth` (8) o `comun`.
3. Escríbelo con `<script setup>`, `defineProps`/`defineEmits`, Tailwind y textos en español. Sin `v-html`.
4. Obtén y guarda datos a través de un store de Pinia que llama a la API (`/api/v1/...`); nunca con un cliente de Supabase con privilegios.
5. Si captura datos, reutiliza el esquema Zod compartido (`@shared/schemas/`) para validar en el cliente.
6. Si la vista está restringida por rol, añade `meta.roles` a la ruta, recordando que el guard no sustituye la verificación de la API.
7. Agrega una prueba unitaria con `@vue/test-utils` en `tests/unit/` si el componente tiene lógica, y un flujo e2e si es una pantalla crítica de la fase.
8. Ejecuta `npm run lint` y `npm run test:unit`.
