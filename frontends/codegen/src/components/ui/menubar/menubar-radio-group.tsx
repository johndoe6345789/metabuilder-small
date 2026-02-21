"use client"

import { createContext, useContext, type ComponentProps } from "react"

interface MenubarRadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
}

const MenubarRadioGroupContext = createContext<MenubarRadioGroupContextValue>({})

export function useMenubarRadioGroupContext() {
  return useContext(MenubarRadioGroupContext)
}

function MenubarRadioGroup({
  value,
  onValueChange,
  children,
  ...props
}: ComponentProps<"div"> & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <MenubarRadioGroupContext.Provider value={{ value, onValueChange }}>
      <div
        data-slot="menubar-radio-group"
        role="group"
        {...props}
      >
        {children}
      </div>
    </MenubarRadioGroupContext.Provider>
  )
}

export { MenubarRadioGroup, MenubarRadioGroupContext }
