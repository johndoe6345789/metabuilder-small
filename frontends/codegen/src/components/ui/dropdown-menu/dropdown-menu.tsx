"use client"

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode, type RefObject } from "react"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: RefObject<HTMLButtonElement | null>
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

export function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext)
  if (!ctx) throw new Error("useDropdownMenuContext must be used within DropdownMenu")
  return ctx
}

function DropdownMenu({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  ...props
}: {
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

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
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div data-slot="dropdown-menu" {...props}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export { DropdownMenu, DropdownMenuContext }
