---
name: componente-vue-fase
description: Crear un componente Vue 3 con <script setup>, Pinia y Tailwind, ubicado en la carpeta de la fase del marco a la que pertenece.
---

# Componente Vue por fase

## Cuándo usarla

- Implementas un componente de la sección "Frontend" de una spec (`StakeholderForm.vue`, `KanoQuestionnaire.vue`, `ValidationGatekeeper.vue`…).
- Creas una vista nueva que agrupa componentes de una fase.

## Pasos

1. Lee la sección "Frontend" y los criterios de aceptación de la spec.
2. Elige la carpeta:

| Spec     | Carpeta                          |
| -------- | -------------------------------- |
| 0        | `src/components/nucleo/`         |
| 1        | `src/components/elicitacion/`    |
| 2, 3     | `src/components/analisis/`       |
| 4        | `src/components/especificacion/` |
| 5, 6     | `src/components/validacion/`     |
| 8        | `src/components/auth/`           |
| 9        | `src/components/metricas/`       |
| genérico | `src/components/comun/`          |

3. Si necesita datos del servidor, crea o amplía el store de Pinia del dominio en `src/stores/`.
4. Escribe el componente con la plantilla. Reutiliza el esquema Zod de `server/schemas/` para validar en el cliente.
5. Si es una vista con restricción de rol, añade la ruta con `meta: { requiresAuth: true, roles: [...] }`.
6. Prueba con `@vue/test-utils` en `tests/unit/` si tiene lógica; flujo e2e en `tests/e2e/` si es crítico.
7. `npm run lint && npm run test:unit`.

## Plantilla

### Store — `src/stores/stakeholders.js`

```js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/lib/api'; // fetch con Bearer token en memoria e interceptor de 401

export const useStakeholdersStore = defineStore('stakeholders', () => {
  const items = ref([]);
  const cargando = ref(false);
  const error = ref(null);

  async function cargar(projectId) {
    cargando.value = true;
    error.value = null;
    try {
      items.value = await api.get(`/projects/${projectId}/stakeholders`);
    } catch (e) {
      error.value = e.message;
    } finally {
      cargando.value = false;
    }
  }

  async function crear(projectId, datos) {
    const nuevo = await api.post(`/projects/${projectId}/stakeholders`, datos);
    items.value.push(nuevo);
    return nuevo;
  }

  return { items, cargando, error, cargar, crear };
});
```

### Componente — `src/components/elicitacion/StakeholderForm.vue`

```vue
<script setup>
import { reactive, ref } from 'vue';
import { stakeholderSchema } from '../../../server/schemas/stakeholder.schema.js';
import { useStakeholdersStore } from '@/stores/stakeholders';

const props = defineProps({
  projectId: { type: String, required: true },
});
const emit = defineEmits(['creado']);

const store = useStakeholdersStore();
const form = reactive({
  nombre: '',
  rol_negocio: '',
  tipo: 'negocio',
  poder: 3,
  legitimidad: 3,
  urgencia: 3,
});
const errores = ref({});

async function enviar() {
  const r = stakeholderSchema.safeParse(form);
  if (!r.success) {
    errores.value = Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
    return;
  }
  errores.value = {};
  emit('creado', await store.crear(props.projectId, r.data));
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="enviar">
    <label class="block">
      <span class="text-sm font-medium text-slate-700">Nombre</span>
      <input v-model="form.nombre" class="mt-1 w-full rounded border-slate-300" maxlength="150" />
      <!-- Interpolación {{ }}: Vue escapa el contenido. Nunca v-html. -->
      <p v-if="errores.nombre" class="text-sm text-red-600">{{ errores.nombre }}</p>
    </label>
    <!-- ... resto de campos ... -->
    <button
      type="submit"
      class="rounded bg-indigo-600 px-4 py-2 text-white"
      :disabled="store.cargando"
    >
      Guardar
    </button>
  </form>
</template>
```

### Ruta restringida — `src/router/index.js`

```js
{
  path: '/proyectos/:projectId/stakeholders',
  component: () => import('@/views/StakeholdersView.vue'),
  meta: { requiresAuth: true, roles: ['lider_tecnico', 'analista_requisitos'] },
},
```

## Checklist final

- [ ] Está en la carpeta de su fase y se llama en PascalCase.
- [ ] `<script setup>`; props y emits declarados; sin Options API.
- [ ] Datos a través de un store que llama a `/api/v1`; nada de Supabase con privilegios en el cliente.
- [ ] Sin `v-html`; textos de usuario interpolados con `{{ }}`.
- [ ] Validación en el cliente con el mismo esquema Zod del servidor (la API vuelve a validar).
- [ ] Estados de carga, error y vacío visibles; textos en español; labels accesibles.
- [ ] Rutas restringidas con `meta.roles` y conciencia de que el guard no es seguridad.
- [ ] Prueba unitaria o e2e según corresponda; `npm run lint` limpio.
