import type { UserRole } from './api'

declare module '#app' {
  interface PageMeta {
    roles?: UserRole[]
    title?: string
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    roles?: UserRole[]
    title?: string
  }
}

export {}
