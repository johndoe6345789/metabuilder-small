import { createContext, useContext } from 'react'
import { MAX_RENDER_DEPTH } from './constants'

const RenderDepthContext = createContext(0)

/**
 * Returns the current render depth and a provider that increments it.
 * Every recursive renderer calls this once at the top. If `exceeded` is
 * true the renderer should bail out with <DepthLimitFallback />.
 */
export function useRenderDepth() {
  const depth = useContext(RenderDepthContext)
  const exceeded = depth >= MAX_RENDER_DEPTH

  function DepthProvider({ children }: { children: React.ReactNode }) {
    return (
      <RenderDepthContext.Provider value={depth + 1}>
        {children}
      </RenderDepthContext.Provider>
    )
  }

  return { depth, exceeded, DepthProvider } as const
}

export function DepthLimitFallback({ componentId }: { componentId?: string }) {
  const { depth } = useRenderDepth()

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div
      style={{
        padding: '4px 8px',
        fontSize: '11px',
        color: 'var(--mat-sys-error, #b00020)',
        backgroundColor: 'var(--mat-sys-error-container, #fdecea)',
        borderRadius: '4px',
        border: '1px dashed var(--mat-sys-error, #b00020)',
      }}
    >
      Render depth limit reached ({depth}){componentId ? ` at "${componentId}"` : ''}
    </div>
  )
}
