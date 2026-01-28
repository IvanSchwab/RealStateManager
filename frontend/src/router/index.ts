import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue')
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/properties',
      name: 'properties',
      component: () => import('@/views/PropertiesView.vue')
    },
    {
      path: '/tenants',
      name: 'tenants',
      component: () => import('@/views/TenantsView.vue')
    },
    {
      path: '/contracts',
      name: 'contracts',
      component: () => import('@/views/ContractsView.vue')
    },
    {
      path: '/payments',
      name: 'payments',
      component: () => import('@/views/PaymentsView.vue')
    }
  ]
})

// TODO: Add navigation guards for authentication
// router.beforeEach((to, from, next) => {
//   // Check if user is authenticated
//   next()
// })

export default router
