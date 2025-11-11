import HomeView from '@/views/HomeView.vue'
import NotesView from '@/views/NotesView.vue'
import ReviewView from '@/views/ReviewView.vue'
import SettingsView from '@/views/SettingsView.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: HomeView,
    },
    {
      path: '/notes/:year?/:week?',
      component: NotesView,
    },
    {
      path: '/review',
      component: ReviewView,
    },
    {
      path: '/settings',
      component: SettingsView,
    },
  ],
})

export default router
