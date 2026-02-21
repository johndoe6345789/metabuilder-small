import { lazy } from 'react'
import { lazyWithPreload } from '@/lib/lazy-loader'
import componentRegistryConfig from '../../component-registry.json'

type ComponentConfig = {
  name: string
  path: string
  export: string
  type: string
  preload?: boolean
  preloadPriority?: 'high' | 'medium' | 'low'
  category?: string
  dependencies?: string[]
  preloadDependencies?: string[]
  experimental?: boolean
  description?: string
}

type RegistryConfig = {
  version: string
  components: ComponentConfig[]
  dialogs: ComponentConfig[]
  pwa: ComponentConfig[]
  preloadStrategy: {
    critical: string[]
    onDemand: string
    preloadDelay: number
  }
}

const config = componentRegistryConfig as RegistryConfig

const preloadMonacoEditor = () => {
  import('@monaco-editor/react').catch(() => {})
}

const dependencyPreloaders: Record<string, () => void> = {
  preloadMonacoEditor
}

// TSX fallback imports — webpack requires static string literals in import() calls.
// These are only used when a component has NOT been converted to JSON yet.
// As components migrate to JSON definitions (in json-components.ts), entries here become unused.
const tsxImportMap: Record<string, () => Promise<any>> = {
  ProjectDashboard: () => import('@/components/ProjectDashboard'),
  ComponentTreeBuilder: () => import('@/components/ComponentTreeBuilder'),
  PlaywrightDesigner: () => import('@/components/PlaywrightDesigner'),
  StorybookDesigner: () => import('@/components/StorybookDesigner'),
  UnitTestDesigner: () => import('@/components/UnitTestDesigner'),
  ProjectSettingsDesigner: () => import('@/components/ProjectSettingsDesigner'),
  PWASettings: () => import('@/components/PWASettings'),
  TemplateSelector: () => import('@/components/TemplateSelector'),
  PersistenceDashboard: () => import('@/components/PersistenceDashboard'),
  PersistenceExample: () => import('@/components/PersistenceExample'),
  AtomicLibraryShowcase: () => import('@/components/AtomicLibraryShowcase'),
}

function resolveExport(module: any, exportName: string, componentName: string): any {
  return module[exportName]
    ?? module[componentName]
    ?? module.default
    ?? Object.values(module).find(v => typeof v === 'function')
}

function createLazyComponent(componentConfig: ComponentConfig) {
  const loader = async () => {
    if (componentConfig.preloadDependencies) {
      componentConfig.preloadDependencies.forEach(depName => {
        const preloader = dependencyPreloaders[depName]
        if (preloader) {
          preloader()
        }
      })
    }

    const exportName = componentConfig.export || componentConfig.name

    // 1. TSX imports first (components with hooks/state that aren't fully converted to JSON yet)
    const tsxLoader = tsxImportMap[exportName] ?? tsxImportMap[componentConfig.name]
    if (tsxLoader) {
      try {
        const module = await tsxLoader()
        const resolved = resolveExport(module, exportName, componentConfig.name)
        if (resolved) {
          return { default: resolved }
        }
      } catch {
        // TSX import failed — fall through to json-components
      }
    }

    // 2. JSON definitions fallback (for components only available as JSON)
    try {
      const jsonComponents = await import('@/lib/json-ui/json-components')
      const resolved = jsonComponents[exportName] ?? jsonComponents[componentConfig.name]
      if (resolved) {
        return { default: resolved }
      }
    } catch {
      // json-components not available
    }

    // 3. Placeholder — don't crash the app
    const Placeholder = () => null
    Placeholder.displayName = `${componentConfig.name}Placeholder`
    return { default: Placeholder }
  }

  if (componentConfig.type === 'dialog' || componentConfig.type === 'pwa') {
    return lazy(loader)
  }

  return lazyWithPreload(loader, componentConfig.name)
}

function buildRegistry(components: ComponentConfig[]) {
  return components.reduce((registry, component) => {
    registry[component.name] = createLazyComponent(component)
    return registry
  }, {} as Record<string, any>)
}

export const ComponentRegistry = buildRegistry(config.components) as Record<string, ReturnType<typeof lazyWithPreload>>
export const DialogRegistry = buildRegistry(config.dialogs) as Record<string, ReturnType<typeof lazy>>
export const PWARegistry = buildRegistry(config.pwa) as Record<string, ReturnType<typeof lazy>>

export function preloadCriticalComponents() {
  const criticalComponents = config.preloadStrategy.critical

  criticalComponents.forEach(componentName => {
    const component = ComponentRegistry[componentName]
    if (component && 'preload' in component && typeof component.preload === 'function') {
      component.preload()
    }
  })
}

export function preloadComponentByName(name: string) {
  const component = ComponentRegistry[name]
  if (component && 'preload' in component && typeof component.preload === 'function') {
    component.preload()
  }
}

export function getComponentMetadata(name: string): ComponentConfig | undefined {
  return [...config.components, ...config.dialogs, ...config.pwa].find(c => c.name === name)
}

export function getComponentsByCategory(category: string): ComponentConfig[] {
  return config.components.filter(c => c.category === category)
}

export function getAllCategories(): string[] {
  const categories = new Set(config.components.map(c => c.category).filter(Boolean))
  return Array.from(categories) as string[]
}

export type ComponentName = keyof typeof ComponentRegistry
export type DialogName = keyof typeof DialogRegistry
export type PWAComponentName = keyof typeof PWARegistry
