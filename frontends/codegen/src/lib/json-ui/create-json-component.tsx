import { createContext, useContext } from 'react'
import { JSONUIRenderer } from './renderer'

/**
 * Context tracking active JSON definition IDs in the current render path.
 * Used to detect self-referencing component definitions that would cause
 * infinite recursion (e.g., a component whose JSON type resolves back to itself).
 */
export const ActiveJsonDefs = createContext<Set<string>>(new Set())

/**
 * Creates a React component from a JSON definition
 * This eliminates the need for wrapper files - components are pure JSON
 */
export function createJsonComponent<TProps = any>(
  jsonDefinition: any
) {
  const defId = jsonDefinition?.id || jsonDefinition?.type || 'unknown'

  return function JsonComponent(props: TProps) {
    const activeDefs = useContext(ActiveJsonDefs)

    if (activeDefs.has(defId)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[JSON-UI] Circular JSON definition detected: "${defId}". Breaking cycle.`
        )
      }
      return null
    }

    const nextDefs = new Set(activeDefs)
    nextDefs.add(defId)

    return (
      <ActiveJsonDefs.Provider value={nextDefs}>
        <JSONUIRenderer
          component={jsonDefinition}
          dataMap={props as Record<string, unknown>}
        />
      </ActiveJsonDefs.Provider>
    )
  }
}
