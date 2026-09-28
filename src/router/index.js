import { createRouter, createWebHistory } from 'vue-router';

// Las rutas de cada fase se agregan en la rama de su spec con meta.requiresAuth y meta.roles.
// El guard beforeEach llega con la Spec 8.
const routes = [{ path: '/', name: 'inicio', component: () => import('@/views/InicioView.vue') }];

export default createRouter({
  history: createWebHistory(),
  routes,
});
