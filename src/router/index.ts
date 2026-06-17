import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
  },
  {
    path: '/image-to-pattern',
    name: 'imageToPattern',
    component: () => import('@/pages/ImageToPatternPage.vue'),
  },
  {
    path: '/draw',
    name: 'draw',
    component: () => import('@/pages/DrawingPage.vue'),
  },
  {
    path: '/patterns',
    name: 'patterns',
    component: () => import('@/pages/PatternListPage.vue'),
  },
  {
    path: '/pattern/:id',
    name: 'patternView',
    component: () => import('@/pages/PatternViewPage.vue'),
  },
  {
    path: '/flip',
    name: 'patternFlip',
    component: () => import('@/pages/PatternFlipPage.vue'),
  },
  {
    path: '/highlight',
    name: 'colorHighlight',
    component: () => import('@/pages/ColorHighlightPage.vue'),
  },
  {
    path: '/drafts',
    name: 'drafts',
    component: () => import('@/pages/DraftListPage.vue'),
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: () => import('@/pages/InventoryPage.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
