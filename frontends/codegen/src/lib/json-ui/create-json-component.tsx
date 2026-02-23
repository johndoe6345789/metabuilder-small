import { JSONUIRenderer } from './renderer'

/**
 * Creates a React component from a JSON definition
 * This eliminates the need for wrapper files - components are pure JSON
 */
export function createJsonComponent<TProps = any>(
  jsonDefinition: any
) {
  return function JsonComponent(props: TProps) {
    return (
      <JSONUIRenderer
        component={jsonDefinition}
        dataMap={props as Record<string, unknown>}
      />
    )
  }
}
