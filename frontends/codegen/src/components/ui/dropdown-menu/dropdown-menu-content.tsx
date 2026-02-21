"use client"

import { type ComponentProps, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

import { useDropdownMenuContext } from "./dropdown-menu"

function DropdownMenuContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: ComponentProps<"div"> & { sideOffset?: number }) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        contentRef.current &&
        !contentRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, setOpen, triggerRef])

  useEffect(() => {
    if (open && contentRef.current) {
      const firstItem = contentRef.current.querySelector<HTMLElement>('[data-slot="dropdown-menu-item"], [data-slot="dropdown-menu-checkbox-item"], [data-slot="dropdown-menu-radio-item"]')
      firstItem?.focus()
    }
  }, [open])

  if (!open) return null

  const portalContent = (
    <div
      ref={contentRef}
      data-slot="dropdown-menu-content"
      data-state={open ? "open" : "closed"}
      role="menu"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
        className
      )}
      style={{
        position: "fixed",
        top: triggerRef.current
          ? triggerRef.current.getBoundingClientRect().bottom + sideOffset
          : 0,
        left: triggerRef.current
          ? triggerRef.current.getBoundingClientRect().left
          : 0,
      }}
      {...props}
    >
      {children}
    </div>
  )

  return createPortal(portalContent, document.body)
}

export { DropdownMenuContent }
