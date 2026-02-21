"use client"

import { type ComponentProps, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

import { useContextMenuContext } from "./context-menu"

function ContextMenuContent({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { open, setOpen, position, triggerRef } = useContextMenuContext()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    function handleContextMenu(e: MouseEvent) {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        if (triggerRef.current && triggerRef.current.contains(e.target as Node)) {
          return
        }
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("contextmenu", handleContextMenu)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [open, setOpen, triggerRef])

  useEffect(() => {
    if (open && contentRef.current) {
      const firstItem = contentRef.current.querySelector<HTMLElement>('[data-slot="context-menu-item"], [data-slot="context-menu-checkbox-item"], [data-slot="context-menu-radio-item"]')
      firstItem?.focus()
    }
  }, [open])

  if (!open) return null

  const portalContent = (
    <div
      ref={contentRef}
      data-slot="context-menu-content"
      data-state={open ? "open" : "closed"}
      role="menu"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-[var(--radix-context-menu-content-available-height)] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
        className
      )}
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
      }}
      {...props}
    >
      {children}
    </div>
  )

  return createPortal(portalContent, document.body)
}

export { ContextMenuContent }
