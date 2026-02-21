"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface DropdownMenuSubContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuSubContext = createContext<DropdownMenuSubContextValue | null>(null)

export function useDropdownMenuSubContext() {
  const ctx = useContext(DropdownMenuSubContext)
  if (!ctx) throw new Error("useDropdownMenuSubContext must be used within DropdownMenuSub")
  return ctx
}

function DropdownMenuSub({
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
    <DropdownMenuSubContext.Provider value={{ open, setOpen }}>
      <div data-slot="dropdown-menu-sub" style={{ position: "relative" }}>
        {children}
      </div>
    </DropdownMenuSubContext.Provider>
  )
}

export { DropdownMenuSub, DropdownMenuSubContext }
