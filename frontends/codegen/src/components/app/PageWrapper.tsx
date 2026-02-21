'use client'

import { Suspense } from 'react'
import { getPageById, resolveProps } from '@/config/page-loader'
import { JSONSchemaPageLoader } from '@/components/JSONSchemaPageLoader'
import { PageRenderer } from '@/lib/json-ui/page-renderer'
import { ComponentRegistry } from '@/lib/component-registry'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import useAppProject from '@/hooks/use-app-project'

function LoadingFallback({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

function LazyComponent({ componentName, props }: { componentName: string; props: any }) {
  const Component = ComponentRegistry[componentName as keyof typeof ComponentRegistry] as any

  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-sm text-muted-foreground">Component {componentName} not found</p>
      </div>
    )
  }

  return (
    <Suspense fallback={<LoadingFallback message={`Loading ${componentName.toLowerCase()}...`} />}>
      <Component {...props} />
    </Suspense>
  )
}

function ResizableLayout({
  leftComponent,
  rightComponent,
  leftProps,
  rightProps,
  config,
}: any) {
  const LeftComponent = ComponentRegistry[leftComponent as keyof typeof ComponentRegistry] as any
  const RightComponent = ComponentRegistry[rightComponent as keyof typeof ComponentRegistry] as any

  if (!LeftComponent || !RightComponent) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-sm text-muted-foreground">Layout components not found</p>
      </div>
    )
  }

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        defaultSize={config.leftPanel.defaultSize}
        minSize={config.leftPanel.minSize}
        maxSize={config.leftPanel.maxSize}
      >
        <Suspense fallback={<LoadingFallback message={`Loading ${leftComponent.toLowerCase()}...`} />}>
          <LeftComponent {...leftProps} />
        </Suspense>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={config.rightPanel.defaultSize}>
        <Suspense fallback={<LoadingFallback message={`Loading ${rightComponent.toLowerCase()}...`} />}>
          <RightComponent {...rightProps} />
        </Suspense>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export function PageWrapper({ pageId }: { pageId: string }) {
  const { stateContext, actionContext } = useAppProject()
  const page = getPageById(pageId)

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-sm text-muted-foreground">Page &quot;{pageId}&quot; not found in pages.json</p>
      </div>
    )
  }

  const props = page.props ? resolveProps(page.props, stateContext, actionContext) : {}

  // JSON page rendering
  if (page.type === 'json' || page.schemaPath) {
    const jsonDataConfig = page.props?.data ?? page.props?.state
    const jsonFunctionsConfig = page.props?.functions ?? page.props?.actions
    const jsonData = jsonDataConfig
      ? resolveProps({ state: jsonDataConfig }, stateContext, actionContext)
      : {}
    const jsonFunctions = jsonFunctionsConfig
      ? resolveProps({ actions: jsonFunctionsConfig }, stateContext, actionContext)
      : {}

    if (page.schema) {
      return <PageRenderer schema={page.schema} data={jsonData} functions={jsonFunctions} />
    }
    if (page.schemaPath) {
      return <JSONSchemaPageLoader schemaPath={page.schemaPath} data={jsonData} functions={jsonFunctions} />
    }
    return <LoadingFallback message={`Schema path missing for JSON page: ${pageId}`} />
  }

  // Resizable layout rendering
  if (page.requiresResizable && page.resizableConfig) {
    const config = page.resizableConfig
    const leftProps = resolveProps(config.leftProps, stateContext, actionContext)

    if (!page.component) {
      return <LoadingFallback message={`Component missing for page: ${pageId}`} />
    }

    return (
      <ResizableLayout
        leftComponent={config.leftComponent}
        rightComponent={page.component}
        leftProps={leftProps}
        rightProps={props}
        config={config}
      />
    )
  }

  // Standard component rendering
  if (!page.component) {
    return <LoadingFallback message={`Component missing for page: ${pageId}`} />
  }

  return <LazyComponent componentName={page.component} props={props} />
}
