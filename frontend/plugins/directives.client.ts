import type { DirectiveBinding } from 'vue'

type OutsideHandler = (event: MouseEvent | TouchEvent) => void

interface ClickOutsideElement extends HTMLElement {
  __clickOutsideHandler?: (event: MouseEvent | TouchEvent) => void
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('click-outside', {
    mounted(el: ClickOutsideElement, binding: DirectiveBinding<OutsideHandler>) {
      const handler = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node | null
        if (target && !el.contains(target)) binding.value(event)
      }
      el.__clickOutsideHandler = handler
      document.addEventListener('mousedown', handler)
      document.addEventListener('touchstart', handler)
    },
    unmounted(el: ClickOutsideElement) {
      if (el.__clickOutsideHandler) {
        document.removeEventListener('mousedown', el.__clickOutsideHandler)
        document.removeEventListener('touchstart', el.__clickOutsideHandler)
        delete el.__clickOutsideHandler
      }
    },
  })
})
