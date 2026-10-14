import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/LoginView.vue') },
    { path: '/', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
    { path: '/bokningar', component: () => import('../views/BookingsView.vue'), meta: { requiresAuth: true } },
    { path: '/boka', component: () => import('../views/BookView.vue'), meta: { requiresAuth: true } },
    { path: '/meddelanden', component: () => import('../views/MessagesView.vue'), meta: { requiresAuth: true } }
  ]
})

// Route guard = användarupplevelse, inte säkerhet. Skyddet sitter i API:t.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.path === '/login' && auth.isAuthenticated) return '/'
})

export default router
