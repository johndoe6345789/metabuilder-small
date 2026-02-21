"use client"

import { createContext, useContext, useState, useCallback, type ComponentProps, type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface MenubarContextValue {
  activeMenu: string | null
  setActiveMenu: (id: string | null) => void
}

const MenubarContext = createContext<MenubarContextValue | null>(null)

export function useMenubarContext() {
  const ctx = useContext(MenubarContext)
  if (!ctx) throw new Error("useMenubarContext must be used within Menubar")
  return ctx
}

function Menubar({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const [activeMenu, setActiveMenuState] = useState<string | null>(null)

  const setActiveMenu = useCallback((id: string | null) => {
    setActiveMenuState(id)
  }, [])

  return (
    <MenubarContext.Provider value={{ activeMenu, setActiveMenu }}>
      <div
        data-slot="menubar"
        role="menubar"
        className={cn(
          "bg-background flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </MenubarContext.Provider>
  )
}

export { Menubar, MenubarContext }
