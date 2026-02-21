"use client"

import { createContext, useContext, useId, type ReactNode } from "react"

interface MenubarMenuContextValue {
  menuId: string
}

const MenubarMenuContext = createContext<MenubarMenuContextValue | null>(null)

export function useMenubarMenuContext() {
  const ctx = useContext(MenubarMenuContext)
  if (!ctx) throw new Error("useMenubarMenuContext must be used within MenubarMenu")
  return ctx
}

function MenubarMenu({
  children,
  value,
}: {
  children?: ReactNode
  value?: string
}) {
  const generatedId = useId()
  const menuId = value ?? generatedId

  return (
    <MenubarMenuContext.Provider value={{ menuId }}>
      <div data-slot="menubar-menu" style={{ position: "relative" }}>
        {children}
      </div>
    </MenubarMenuContext.Provider>
  )
}

export { MenubarMenu, MenubarMenuContext }
