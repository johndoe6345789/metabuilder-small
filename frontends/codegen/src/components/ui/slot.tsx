"use client"

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react"

import { cn } from "@/lib/utils"

/**
 * Slot renders its single child element, merging its own props (className, event
 * handlers, data-* attributes, etc.) into the child.  This avoids an extra DOM
 * wrapper and is the pattern behind Radix UI's `asChild` prop.
 *
 * Usage:
 *   <Slot className="extra" onClick={handleClick}>
 *     <Button>Click me</Button>
 *   </Slot>
 *
 * Renders the <Button> with merged className and onClick — no extra <div>/<button>.
 */
const Slot = forwardRef<HTMLElement, HTMLAttributes<HTMLElement> & { children?: ReactNode }>(
  function Slot({ children, ...slotProps }, forwardedRef) {
    const child = Children.only(children)

    if (!isValidElement(child)) {
      return null
    }

    const childProps = child.props as Record<string, unknown>

    const mergedProps: Record<string, unknown> = { ...slotProps }

    // Merge className via cn()
    if (slotProps.className || childProps.className) {
      mergedProps.className = cn(
        childProps.className as string | undefined,
        slotProps.className
      )
    }

    // Merge event handlers — call both slot's and child's handler
    for (const key of Object.keys(slotProps)) {
      if (
        key.startsWith("on") &&
        typeof (slotProps as Record<string, unknown>)[key] === "function"
      ) {
        const slotHandler = (slotProps as Record<string, unknown>)[key] as (...args: unknown[]) => void
        const childHandler = childProps[key]

        if (typeof childHandler === "function") {
          mergedProps[key] = (...args: unknown[]) => {
            slotHandler(...args)
            ;(childHandler as (...args: unknown[]) => void)(...args)
          }
        }
      }
    }

    // Merge refs
    if (forwardedRef) {
      mergedProps.ref = forwardedRef
    }

    return cloneElement(child as ReactElement<any>, mergedProps)
  }
)

export { Slot }
