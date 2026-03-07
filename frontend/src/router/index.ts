import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/auth/ForgotPasswordView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPasswordView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/views/OnboardingView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: false },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/properties',
      name: 'properties',
      component: () => import('@/views/PropertiesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/properties/:id',
      name: 'property-details',
      component: () => import('@/views/PropertyDetailsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tenants',
      name: 'tenants',
      component: () => import('@/views/TenantsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tenants/:id',
      name: 'tenant-details',
      component: () => import('@/views/TenantDetailsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/owners',
      name: 'owners',
      component: () => import('@/views/OwnersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/owners/:id',
      name: 'owner-details',
      component: () => import('@/views/OwnerDetailsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/contracts',
      name: 'Contracts',
      component: () => import('@/views/ContractsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/contracts/:id',
      name: 'contract-details',
      component: () => import('@/views/ContractDetailsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/payments',
      name: 'payments',
      component: () => import('@/views/PaymentsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Public routes that don't require any auth checks
  const publicRoutes = ['login', 'forgot-password', 'reset-password']
  const isPublicRoute = publicRoutes.includes(to.name as string)

  // 1. Always allow public routes immediately — no auth checks needed
  if (isPublicRoute) {
    return next()
  }

  // 2. For ALL protected routes, wait for auth to fully initialize
  // initialize() is idempotent — safe to call multiple times
  await authStore.initialize()

  const isAuthenticated = authStore.isAuthenticated
  const profile = authStore.profile

  // 3. Not authenticated → go to login
  if (!isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  const hasOrganization = profile?.organization_id != null

  // 4. Authenticated but no organization → go to onboarding
  if (!hasOrganization && to.name !== 'onboarding') {
    return next({ name: 'onboarding' })
  }

  // 5. Authenticated with organization, trying to access onboarding → go to dashboard
  if (hasOrganization && to.name === 'onboarding') {
    return next({ name: 'dashboard' })
  }

  // 6. All good — allow navigation
  return next()
})

export default router
