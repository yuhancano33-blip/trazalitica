<script setup>
const fases = [
  { nombre: 'Elicitación', color: 'bg-fase-elicitacion' },
  { nombre: 'Análisis y Priorización', color: 'bg-fase-analisis' },
  { nombre: 'Especificación', color: 'bg-fase-especificacion' },
  { nombre: 'Validación y Trazabilidad', color: 'bg-fase-validacion' },
];
</script>

<template>
  <main class="mx-auto max-w-3xl p-8">
    <h1 class="text-2xl font-semibold">Trazalitica</h1>
    <p class="mt-2 text-slate-600">Gestión de requisitos en proyectos de análisis de datos.</p>
    <ol class="mt-6 grid gap-3 sm:grid-cols-4">
      <li
        v-for="(fase, i) in fases"
        :key="fase.nombre"
        class="rounded p-3 text-sm font-medium text-white"
        :class="fase.color"
      >
        {{ i + 1 }}. {{ fase.nombre }}
      </li>
    </ol>
  </main>
</template>
