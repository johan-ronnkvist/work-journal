import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createHead } from '@unhead/vue/client'
import App from '../App.vue'

describe('App', () => {
  it('mounts renders properly', async () => {
    // Create a mock router
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'home',
          component: { template: '<div>Home</div>' },
        },
      ],
    })

    // Create head plugin for meta tag management
    const head = createHead()

    // Mount with router and head plugin
    const wrapper = mount(App, {
      global: {
        plugins: [router, head],
      },
    })

    // Wait for router to be ready
    await router.isReady()

    // Basic mount test - just check it renders without crashing
    expect(wrapper.exists()).toBe(true)
  })
})
