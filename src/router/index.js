import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/game',
    },
    {
      path: '/game',
      name: 'game',
      component: () => import('@/views/game/Index.vue')
    }
  ]
})

export default router
