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

// FakeMUI primitives — registered explicitly to prevent collisions
// with icon names (e.g. "Stack" icon = createMaterialIcon('layers'))
// and to break circular JSON stub definitions (e.g. section.json has
// type: "Section" which would resolve back to itself without this).
import { Stack } from '@metabuilder/fakemui/layout'
import { Flex } from '@metabuilder/fakemui/layout'
import { Grid } from '@metabuilder/fakemui/layout'
import { Heading } from '@metabuilder/fakemui/atoms'
import { Text } from '@metabuilder/fakemui/atoms'
import { Section } from '@metabuilder/fakemui/atoms'
import { Separator } from '@metabuilder/fakemui/data-display'
import { Badge } from '@metabuilder/fakemui/data-display'
import { Chip } from '@metabuilder/fakemui/data-display'
import { Avatar } from '@metabuilder/fakemui/data-display'
import { AvatarGroup } from '@metabuilder/fakemui/data-display'
import { ButtonGroup } from '@metabuilder/fakemui/inputs'
import { IconButton } from '@metabuilder/fakemui/inputs'
import { Card } from '@metabuilder/fakemui/surfaces'
import { Alert } from '@metabuilder/fakemui/feedback'
import { Link } from '@metabuilder/fakemui/navigation'

const fakeMuiComponents: UIComponentRegistry = {
  Stack: Stack as unknown as ComponentType<any>,
  Flex: Flex as unknown as ComponentType<any>,
  Grid: Grid as unknown as ComponentType<any>,
  Heading: Heading as unknown as ComponentType<any>,
  Text: Text as unknown as ComponentType<any>,
  Section: Section as unknown as ComponentType<any>,
  Separator: Separator as unknown as ComponentType<any>,
  Badge: Badge as unknown as ComponentType<any>,
  Chip: Chip as unknown as ComponentType<any>,
  Avatar: Avatar as unknown as ComponentType<any>,
  AvatarGroup: AvatarGroup as unknown as ComponentType<any>,
  ButtonGroup: ButtonGroup as unknown as ComponentType<any>,
  IconButton: IconButton as unknown as ComponentType<any>,
  Card: Card as unknown as ComponentType<any>,
  Alert: Alert as unknown as ComponentType<any>,
  Link: Link as unknown as ComponentType<any>,
}

// Explicit component-tree-builder sub-components — require.context lazy loading
// resolves these to () => null because the async dynamic import fails.
// Register them directly so the JSON renderer can find them.
import { ComponentTreeToolbar } from '@/components/component-tree-builder/ComponentTreeToolbar'
import { ComponentTreeView } from '@/components/component-tree-builder/ComponentTreeView'
import { ComponentInspector } from '@/components/component-tree-builder/ComponentInspector'

// MonacoEditorWrapper uses @monaco-editor/react which needs explicit registration
// (same issue — require.context + next/dynamic resolves to () => null).
import { MonacoEditorWrapper } from '@/components/ui/monaco-editor-wrapper'

// File explorer components — next/dynamic fallback resolves to () => null
// in Turbopack dev mode. Register explicitly so JSON renderer finds them.
import { FileExplorerList } from '@/components/file-explorer/FileExplorerList'
import { FileExplorerDialog } from '@/components/file-explorer/FileExplorerDialog'

// ScrollArea from components/ui — should be in uiComponentMap via require.context
// but Turbopack dev mode doesn't always resolve it. Explicit import is safe.
import { ScrollArea } from '@/components/ui/scroll-area'

// Atomic library section components — require.context + next/dynamic resolves
// to () => null in Turbopack dev mode for sub-directory components.
import { ButtonsActionsSection } from '@/components/atomic-library/ButtonsActionsSection'
import { BadgesIndicatorsSection } from '@/components/atomic-library/BadgesIndicatorsSection'
import { TypographySection } from '@/components/atomic-library/TypographySection'
import { FormControlsSection } from '@/components/atomic-library/FormControlsSection'
import { ProgressLoadingSection } from '@/components/atomic-library/ProgressLoadingSection'
import { FeedbackSection } from '@/components/atomic-library/FeedbackSection'
import { AvatarsUserElementsSection } from '@/components/atomic-library/AvatarsUserElementsSection'
import { CardsMetricsSection } from '@/components/atomic-library/CardsMetricsSection'
import { InteractiveElementsSection } from '@/components/atomic-library/InteractiveElementsSection'
import { LayoutComponentsSection } from '@/components/atomic-library/LayoutComponentsSection'
import { EnhancedComponentsSection } from '@/components/atomic-library/EnhancedComponentsSection'
import { SummarySection } from '@/components/atomic-library/SummarySection'

const componentTreeSubComponents: UIComponentRegistry = {
  ComponentTreeToolbar: ComponentTreeToolbar as unknown as ComponentType<any>,
  ComponentTreeView: ComponentTreeView as unknown as ComponentType<any>,
  ComponentInspector: ComponentInspector as unknown as ComponentType<any>,
  MonacoEditorWrapper: MonacoEditorWrapper as unknown as ComponentType<any>,
  FileExplorerList: FileExplorerList as unknown as ComponentType<any>,
  FileExplorerDialog: FileExplorerDialog as unknown as ComponentType<any>,
  ScrollArea: ScrollArea as unknown as ComponentType<any>,
  ButtonsActionsSection: ButtonsActionsSection as unknown as ComponentType<any>,
  BadgesIndicatorsSection: BadgesIndicatorsSection as unknown as ComponentType<any>,
  TypographySection: TypographySection as unknown as ComponentType<any>,
  FormControlsSection: FormControlsSection as unknown as ComponentType<any>,
  ProgressLoadingSection: ProgressLoadingSection as unknown as ComponentType<any>,
  FeedbackSection: FeedbackSection as unknown as ComponentType<any>,
  AvatarsUserElementsSection: AvatarsUserElementsSection as unknown as ComponentType<any>,
  CardsMetricsSection: CardsMetricsSection as unknown as ComponentType<any>,
  InteractiveElementsSection: InteractiveElementsSection as unknown as ComponentType<any>,
  LayoutComponentsSection: LayoutComponentsSection as unknown as ComponentType<any>,
  EnhancedComponentsSection: EnhancedComponentsSection as unknown as ComponentType<any>,
  SummarySection: SummarySection as unknown as ComponentType<any>,
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

// Primitive HTML elements are stored as string literals (e.g. 'div').
// React accepts strings as valid element types at runtime, but the registry
// type expects ComponentType<any>, so `as any` is required to satisfy the
// TypeScript type checker without wrapping every element in a function component.
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
  ...fakeMuiComponents,
  ...componentTreeSubComponents,
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
  // JSON components must resolve BEFORE icons — resolveIconComponent is a
  // catch-all that wraps any unknown type in a dynamic(() => null) from the
  // icon module, which would shadow the real JSON component definitions.
  return resolveWrapperComponent(type) ?? uiComponentRegistry[type] ?? uiComponentMap[type] ?? resolveJsonComponent(type) ?? resolveIconComponent(type) ?? null
}

export function hasComponent(type: string): boolean {
  return Boolean(resolveWrapperComponent(type) ?? uiComponentRegistry[type] ?? uiComponentMap[type] ?? resolveJsonComponent(type) ?? resolveIconComponent(type))
}

export function getDeprecatedComponentInfo(type: string): DeprecatedComponentInfo | null {
  return deprecatedComponentInfo[type] ?? null
}
