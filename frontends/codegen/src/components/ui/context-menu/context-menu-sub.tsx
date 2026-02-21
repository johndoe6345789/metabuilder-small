"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface ContextMenuSubContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const ContextMenuSubContext = createContext<ContextMenuSubContextValue | null>(null)

export function useContextMenuSubContext() {
  const ctx = useContext(ContextMenuSubContext)
  if (!ctx) throw new Error("useContextMenuSubContext must be used within ContextMenuSub")
  return ctx
}

function ContextMenuSub({
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
    <ContextMenuSubContext.Provider value={{ open, setOpen }}>
      <div data-slot="context-menu-sub" style={{ position: "relative" }}>
        {children}
      </div>
    </ContextMenuSubContext.Provider>
  )
}

export { ContextMenuSub, ContextMenuSubContext }
