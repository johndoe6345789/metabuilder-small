"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface MenubarSubContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const MenubarSubContext = createContext<MenubarSubContextValue | null>(null)

export function useMenubarSubContext() {
  const ctx = useContext(MenubarSubContext)
  if (!ctx) throw new Error("useMenubarSubContext must be used within MenubarSub")
  return ctx
}

function MenubarSub({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: {
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = useCallback(
    (value: boolean) => {
      if (!isControlled) setUncontrolledOpen(value)
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <MenubarSubContext.Provider value={{ open, setOpen }}>
      <div data-slot="menubar-sub" style={{ position: "relative" }}>
        {children}
      </div>
    </MenubarSubContext.Provider>
  )
}

export { MenubarSub, MenubarSubContext }
