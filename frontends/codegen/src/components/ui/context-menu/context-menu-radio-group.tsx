"use client"

import { createContext, useContext, type ComponentProps } from "react"

interface ContextMenuRadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
}

const ContextMenuRadioGroupContext = createContext<ContextMenuRadioGroupContextValue>({})

export function useContextMenuRadioGroupContext() {
  return useContext(ContextMenuRadioGroupContext)
}

function ContextMenuRadioGroup({
  value,
  onValueChange,
  children,
  ...props
}: ComponentProps<"div"> & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <ContextMenuRadioGroupContext.Provider value={{ value, onValueChange }}>
      <div
        data-slot="context-menu-radio-group"
        role="group"
        {...props}
      >
        {children}
      </div>
    </ContextMenuRadioGroupContext.Provider>
  )
}

export { ContextMenuRadioGroup, ContextMenuRadioGroupContext }
