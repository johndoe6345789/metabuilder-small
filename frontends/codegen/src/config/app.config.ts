export const APP_CONFIG = {
  logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',

  features: {
    preloadCriticalComponents: true,
    bundleMetrics: true,
  },

  performance: {
    enablePreloading: true,
    preloadDelay: 100,
    seedDataTimeout: 100,
  }
} as const

export type AppConfig = typeof APP_CONFIG
