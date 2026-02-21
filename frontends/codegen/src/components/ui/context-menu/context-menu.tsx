"use client"

import { createContext, useContext, useState, useCallback, useRef, type ReactNode, type RefObject } from "react"

interface ContextMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  position: { x: number; y: number }
  setPosition: (pos: { x: number; y: number }) => void
  triggerRef: RefObject<HTMLDivElement | null>
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null)

export function useContextMenuContext() {
  const ctx = useContext(ContextMenuContext)
  if (!ctx) throw new Error("useContextMenuContext must be used within ContextMenu")
  return ctx
}

function ContextMenu({
  children,
  onOpenChange,
  ...props
}: {
  children?: ReactNode
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpenState] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement | null>(null)

  const setOpen = useCallback(
    (value: boolean) => {
      setOpenState(value)
      onOpenChange?.(value)
    },
    [onOpenChange]
  )

  return (
    <ContextMenuContext.Provider value={{ open, setOpen, position, setPosition, triggerRef }}>
      <div data-slot="context-menu" {...props}>
        {children}
      </div>
    </ContextMenuContext.Provider>
  )
}

export { ContextMenu, ContextMenuContext }
