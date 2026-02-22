import { ComponentType } from 'react'
import dynamic from 'next/dynamic'
import jsonComponentsRegistry from '../../../json-components-registry.json'

export interface UIComponentRegistry {
  [key: string]: ComponentType<any>
}

interface JsonRegistryEntry {
  name?: string
  type?: string
  export?: string
  source?: string
  status?: string
  wrapperRequired?: boolean
  wrapperComponent?: string
  wrapperFor?: string
  load?: {
    path?: string
    export?: string
  }
  deprecated?: DeprecatedComponentInfo
}

interface JsonComponentRegistry {
  components?: JsonRegistryEntry[]
  sourceRoots?: Record<string, string[]>
}

export interface DeprecatedComponentInfo {
  replacedBy?: string
  message?: string
}

const jsonRegistry = jsonComponentsRegistry as JsonComponentRegistry

const getRegistryEntryKey = (entry: JsonRegistryEntry): string | undefined =>
  entry.name ?? entry.type

const getRegistryEntryExportName = (entry: JsonRegistryEntry): string | undefined =>
  entry.load?.export ?? entry.export ?? getRegistryEntryKey(entry)

const jsonRegistryEntries = jsonRegistry.components ?? []
const registryEntryByType = new Map(
  jsonRegistryEntries
    .map((entry) => {
      const entryKey = getRegistryEntryKey(entry)
      return entryKey ? [entryKey, entry] : null
    })
    .filter((entry): entry is [string, JsonRegistryEntry] => Boolean(entry))
)
const deprecatedComponentInfo = jsonRegistryEntries.reduce<Record<string, DeprecatedComponentInfo>>(
  (acc, entry) => {
    const entryKey = getRegistryEntryKey(entry)
    if (!entryKey) {
      return acc
    }
    if (entry.status === 'deprecated' || entry.deprecated) {
      acc[entryKey] = entry.deprecated ?? {}
    }
    return acc
  },
  {}
)

const buildComponentMapFromExports = (
  exports: Record<string, unknown>
): Record<string, ComponentType<any>> => {
  return Object.entries(exports).reduce<Record<string, ComponentType<any>>>((acc, [key, value]) => {
    if (value && (typeof value === 'function' || typeof value === 'object')) {
      acc[key] = value as ComponentType<any>
    }
    return acc
  }, {})
}

const buildComponentMapFromModules = (
  modules: Record<string, unknown>
): Record<string, ComponentType<any>> => {
  return Object.values(modules).reduce<Record<string, ComponentType<any>>>((acc, moduleExports) => {
    if (!moduleExports || typeof moduleExports !== 'object') {
      return acc
    }
    Object.entries(buildComponentMapFromExports(moduleExports as Record<string, unknown>)).forEach(
      ([key, component]) => {
        acc[key] = component
      }
    )
    return acc
  }, {})
}

// Convert webpack require.context to a Record<string, module> matching Vite's import.meta.glob format
function contextToModules(ctx: __WebpackModuleApi.RequireContext): Record<string, unknown> {
  const modules: Record<string, unknown> = {}
  for (const key of ctx.keys()) {
    modules[key] = ctx(key)
  }
  return modules
}

// UI components stay sync — small Radix wrappers used on every page
const uiModules = contextToModules(require.context('@/components/ui', true, /\.(ts|tsx)$/))
const uiComponentMap = buildComponentMapFromModules(uiModules)

// FakeMUI layout primitives — registered explicitly to prevent collisions
// with icon names (e.g. "Stack" icon = createMaterialIcon('layers')).
import { Stack } from '@metabuilder/fakemui/layout'
import { Flex } from '@metabuilder/fakemui/layout'
import { Heading } from '@metabuilder/fakemui/atoms'
import { Text } from '@metabuilder/fakemui/atoms'
import { Separator } from '@metabuilder/fakemui/data-display'

const fakeMuiLayoutComponents: UIComponentRegistry = {
  Stack: Stack as unknown as ComponentType<any>,
  Flex: Flex as unknown as ComponentType<any>,
  Heading: Heading as unknown as ComponentType<any>,
  Text: Text as unknown as ComponentType<any>,
  Separator: Separator as unknown as ComponentType<any>,
}

// Lazy contexts — each file becomes its own async chunk, loaded on demand.
// If one module has a bug, only that component fails (easier to debug).
const atomContext = require.context('@/components/atoms', false, /\.tsx$/)
const moleculeContext = require.context('@/components/molecules', false, /\.tsx$/)
const organismContext = require.context('@/components/organisms', false, /\.tsx$/)
const explicitContext = require.context('@/components', true, /\.tsx$/)

const normalizeLoadPath = (loadPath: string): string => {
  // Convert @/components/Foo to ./Foo.tsx (require.context key format)
  let normalized = loadPath
  if (normalized.startsWith('@/components/')) {
    normalized = './' + normalized.slice('@/components/'.length)
  }
  if (!normalized.endsWith('.tsx') && !normalized.endsWith('.ts')) {
    normalized += '.tsx'
  }
  return normalized
}

// Create a next/dynamic wrapper that lazily loads a component from a webpack context
function createDynamicFromContext(
  ctx: __WebpackModuleApi.RequireContext,
  contextKey: string,
  exportName: string
): ComponentType<any> {
  return dynamic(
    () => ctx(contextKey).then((mod: any) => ({
      default: mod[exportName] ?? mod.default ?? (() => null)
    })),
    { ssr: false }
  )
}

// Find a context key by matching a load path or export name against context keys
function findContextKey(
  ctx: __WebpackModuleApi.RequireContext,
  loadPath?: string,
  exportName?: string,
  entryKey?: string
): string | undefined {
  if (loadPath) {
    const normalized = normalizeLoadPath(loadPath)
    const found = ctx.keys().find(k => k === loadPath || k === normalized)
    if (found) return found
  }
  // Try matching by filename
  if (exportName || entryKey) {
    return ctx.keys().find(k => {
      const name = k.replace(/^\.\//, '').replace(/\.(tsx?|jsx?)$/, '').split('/').pop()
      return name === exportName || name === entryKey
    })
  }
  return undefined
}

// Build registry entries using lazy context — each component is a next/dynamic wrapper
const buildRegistryFromEntries = (
  source: string,
  lazyCtx: __WebpackModuleApi.RequireContext | null,
  syncMap?: Record<string, ComponentType<any>>
): UIComponentRegistry => {
  return jsonRegistryEntries
    .filter((entry) => entry.source === source)
    .reduce<UIComponentRegistry>((registry, entry) => {
      const entryKey = getRegistryEntryKey(entry)
      const entryExportName = getRegistryEntryExportName(entry)
      if (!entryKey || !entryExportName) {
        return registry
      }

      // 1. Try sync map (for UI components loaded eagerly)
      if (syncMap?.[entryExportName]) {
        registry[entryKey] = syncMap[entryExportName]
        return registry
      }

      // 2. Try explicit load path via lazy context
      if (entry.load?.path) {
        const contextKey = findContextKey(explicitContext, entry.load.path)
        if (contextKey) {
          registry[entryKey] = createDynamicFromContext(explicitContext, contextKey, entryExportName)
          return registry
        }
      }

      // 3. Try source-specific lazy context
      if (lazyCtx) {
        const contextKey = findContextKey(lazyCtx, undefined, entryExportName, entryKey)
        if (contextKey) {
          registry[entryKey] = createDynamicFromContext(lazyCtx, contextKey, entryExportName)
          return registry
        }
      }

      // 4. Fallback: try explicit context by name
      const fallbackKey = findContextKey(explicitContext, undefined, entryExportName, entryKey)
      if (fallbackKey) {
        registry[entryKey] = createDynamicFromContext(explicitContext, fallbackKey, entryExportName)
      }

      return registry
    }, {})
}

export const primitiveComponents: UIComponentRegistry = {
  div: 'div' as any,
  span: 'span' as any,
  p: 'p' as any,
  h1: 'h1' as any,
  h2: 'h2' as any,
  h3: 'h3' as any,
  h4: 'h4' as any,
  h5: 'h5' as any,
  h6: 'h6' as any,
  section: 'section' as any,
  article: 'article' as any,
  header: 'header' as any,
  footer: 'footer' as any,
  main: 'main' as any,
  aside: 'aside' as any,
  nav: 'nav' as any,
  button: 'button' as any,
  input: 'input' as any,
  select: 'select' as any,
  textarea: 'textarea' as any,
  form: 'form' as any,
  label: 'label' as any,
  a: 'a' as any,
  img: 'img' as any,
  list: 'div' as any,
}

export const shadcnComponents: UIComponentRegistry = buildRegistryFromEntries(
  'ui',
  null,
  uiComponentMap
)

export const atomComponents: UIComponentRegistry = buildRegistryFromEntries(
  'atoms',
  atomContext
)

export const moleculeComponents: UIComponentRegistry = buildRegistryFromEntries(
  'molecules',
  moleculeContext
)

export const organismComponents: UIComponentRegistry = buildRegistryFromEntries(
  'organisms',
  organismContext
)

export const jsonWrapperComponents: UIComponentRegistry = buildRegistryFromEntries(
  'wrappers',
  null
)

// Icons are lazy-loaded on first lookup via resolveIconComponent()
export const iconComponents: UIComponentRegistry = {}

export const customComponents: UIComponentRegistry = buildRegistryFromEntries(
  'custom',
  null
)

export const componentsComponents: UIComponentRegistry = buildRegistryFromEntries(
  'components',
  null
)

export const uiComponentRegistry: UIComponentRegistry = {
  ...primitiveComponents,
  ...fakeMuiLayoutComponents,
  ...shadcnComponents,
  ...atomComponents,
  ...moleculeComponents,
  ...organismComponents,
  ...jsonWrapperComponents,
  ...iconComponents,
  ...customComponents,
  ...componentsComponents,
}

export function registerComponent(name: string, component: ComponentType<any>) {
  uiComponentRegistry[name] = component
}

const resolveWrapperComponent = (type: string): ComponentType<any> | null => {
  const entry = registryEntryByType.get(type)
  if (entry?.wrapperRequired && entry.wrapperComponent) {
    return uiComponentRegistry[entry.wrapperComponent] || null
  }
  return null
}

// Lazy-loaded JSON components — each resolved via next/dynamic on first miss.
const jsonComponentDynamicCache = new Map<string, ComponentType<any>>()

function resolveJsonComponent(type: string): ComponentType<any> | null {
  if (jsonComponentDynamicCache.has(type)) {
    return jsonComponentDynamicCache.get(type)!
  }
  const LazyJson = dynamic(
    () => import('@/lib/json-ui/json-components').then(mod => {
      const component = (mod as Record<string, any>)[type]
      if (!component) return { default: (() => null) as unknown as ComponentType }
      return { default: component }
    }),
    { ssr: false }
  )
  jsonComponentDynamicCache.set(type, LazyJson)
  uiComponentRegistry[type] = LazyJson
  return LazyJson
}

// Lazy-loaded Phosphor Icons via next/dynamic — creates a separate chunk
// that only loads when an icon is actually rendered (not at initial page load).
const iconDynamicCache = new Map<string, ComponentType<any>>()

function resolveIconComponent(type: string): ComponentType<any> | null {
  if (iconDynamicCache.has(type)) {
    return iconDynamicCache.get(type)!
  }
  const LazyIcon = dynamic(
    () => import('@metabuilder/fakemui/icons').then(mod => {
      const Icon = (mod as Record<string, any>)[type]
      if (!Icon) return { default: (() => null) as unknown as ComponentType }
      return { default: Icon }
    }),
    { ssr: false }
  )
  iconDynamicCache.set(type, LazyIcon)
  uiComponentRegistry[type] = LazyIcon
  return LazyIcon
}

export function getUIComponent(type: string): ComponentType<any> | string | null {
  return resolveWrapperComponent(type) ?? uiComponentRegistry[type] ?? uiComponentMap[type] ?? resolveIconComponent(type) ?? resolveJsonComponent(type) ?? null
}

export function hasComponent(type: string): boolean {
  return Boolean(resolveWrapperComponent(type) ?? uiComponentRegistry[type] ?? uiComponentMap[type] ?? resolveIconComponent(type) ?? resolveJsonComponent(type))
}

export function getDeprecatedComponentInfo(type: string): DeprecatedComponentInfo | null {
  return deprecatedComponentInfo[type] ?? null
}
