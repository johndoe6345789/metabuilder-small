"use client"

import { createContext, useContext, type ComponentProps } from "react"

interface DropdownMenuRadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
}

const DropdownMenuRadioGroupContext = createContext<DropdownMenuRadioGroupContextValue>({})

export function useDropdownMenuRadioGroupContext() {
  return useContext(DropdownMenuRadioGroupContext)
}

function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
  ...props
}: ComponentProps<"div"> & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <DropdownMenuRadioGroupContext.Provider value={{ value, onValueChange }}>
      <div
        data-slot="dropdown-menu-radio-group"
        role="group"
        {...props}
      >
        {children}
      </div>
    </DropdownMenuRadioGroupContext.Provider>
  )
}

export { DropdownMenuRadioGroup, DropdownMenuRadioGroupContext }
