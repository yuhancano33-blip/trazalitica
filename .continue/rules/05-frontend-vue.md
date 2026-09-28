---
name: Frontend Vue
description: Composition API, Pinia, guards de rutas y organización de componentes por fase del marco.
globs: ['src/**/*.{vue,js}', 'tests/e2e/**']
---

# Frontend Vue 3

Plantilla completa: `.agents/skills/componente-vue-fase/`.

## Componentes

- Solo `<script setup>` (JavaScript). Nada de Options API.
- `defineProps` / `defineEmits` con validación; props de solo lectura, cambios vía `emit`.
- Nombres en PascalCase y ubicados por fase:

| Carpeta                          | Contenido                                            | Spec |
| -------------------------------- | ---------------------------------------------------- | ---- |
| `src/components/nucleo/`         | Proyectos, objetivos, requisitos, KPI, fuentes       | 0    |
| `src/components/elicitacion/`    | Stakeholders, saliencia, actas, VOC, caso de negocio | 1    |
| `src/components/analisis/`       | Kano, viabilidad, DAPS                               | 2, 3 |
| `src/components/especificacion/` | Fichas, árbol CTQ, matriz CTQ-KPI, backlog           | 4    |
| `src/components/validacion/`     | Trazabilidad, historial, gates                       | 5, 6 |
| `src/components/metricas/`       | Tablero del estudio de caso                          | 9    |
| `src/components/auth/`           | Login, reautenticación                               | 8    |
| `src/components/comun/`          | Piezas genéricas sin lógica de fase                  | —    |

## Estado (Pinia)

- Stores con sintaxis setup (`defineStore('id', () => { ... })`), uno por dominio.
- El servidor es la fuente de verdad; persistencia local solo cuando la spec lo pide (Kano, en `sessionStorage`).
- El access token vive en memoria (store de auth sin persistencia). El refresh token nunca se toca desde JS (cookie HttpOnly).

## Rutas

- `meta: { requiresAuth: true, roles: [...] }` y un `beforeEach` como en la Spec 8.
- Los guards mejoran la experiencia; no son seguridad. La API y RLS deciden.
- Vistas cargadas de forma diferida (`() => import(...)`).

## Seguridad y estilo

- Prohibido `v-html` con datos de usuario (ESLint `vue/no-v-html`).
- Solo variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el cliente.
- Tailwind para estilos; nada de `<style>` global salvo `src/style.css`.
- Textos de la interfaz en español; accesibles (labels, `aria-*`, foco visible).
