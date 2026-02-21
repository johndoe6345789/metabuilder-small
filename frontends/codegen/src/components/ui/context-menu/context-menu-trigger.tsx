"use client"

import { type ComponentProps } from "react"

import { useContextMenuContext } from "./context-menu"

function ContextMenuTrigger({
  children,
  asChild,
  disabled,
  ...props
}: ComponentProps<"div"> & { asChild?: boolean; disabled?: boolean }) {
  const { setOpen, setPosition, triggerRef } = useContextMenuContext()

  return (
    <div
      data-slot="context-menu-trigger"
      ref={triggerRef}
      onContextMenu={(e) => {
        if (disabled) return
        e.preventDefault()
        setPosition({ x: e.clientX, y: e.clientY })
        setOpen(true)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export { ContextMenuTrigger }
