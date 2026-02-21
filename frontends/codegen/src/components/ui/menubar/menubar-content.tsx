"use client"

import { type ComponentProps, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

import { useMenubarContext } from "./menubar"
import { useMenubarMenuContext } from "./menubar-menu"

function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  children,
  ...props
}: ComponentProps<"div"> & {
  align?: "start" | "center" | "end"
  alignOffset?: number
  sideOffset?: number
}) {
  const { activeMenu, setActiveMenu } = useMenubarContext()
  const { menuId } = useMenubarMenuContext()
  const contentRef = useRef<HTMLDivElement>(null)
  const isOpen = activeMenu === menuId

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (contentRef.current && !contentRef.current.contains(target)) {
        const trigger = document.querySelector(`[data-slot="menubar-trigger"][data-state="open"]`)
        if (trigger && trigger.contains(target)) return
        const menubar = document.querySelector('[data-slot="menubar"]')
        if (menubar && menubar.contains(target)) return
        setActiveMenu(null)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveMenu(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, setActiveMenu])

  useEffect(() => {
    if (isOpen && contentRef.current) {
      const firstItem = contentRef.current.querySelector<HTMLElement>('[data-slot="menubar-item"], [data-slot="menubar-checkbox-item"], [data-slot="menubar-radio-item"]')
      firstItem?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const trigger = document.querySelector(`[data-slot="menubar-menu"]:has([data-state="open"]) [data-slot="menubar-trigger"]`) as HTMLElement | null
  const triggerRect = trigger?.getBoundingClientRect()

  let left = (triggerRect?.left ?? 0) + alignOffset
  if (align === "center" && triggerRect) {
    left = triggerRect.left + triggerRect.width / 2 + alignOffset
  } else if (align === "end" && triggerRect) {
    left = triggerRect.right + alignOffset
  }

  const portalContent = (
    <div
      ref={contentRef}
      data-slot="menubar-content"
      data-state={isOpen ? "open" : "closed"}
      role="menu"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-md",
        className
      )}
      style={{
        position: "fixed",
        top: (triggerRect?.bottom ?? 0) + sideOffset,
        left,
      }}
      {...props}
    >
      {children}
    </div>
  )

  return createPortal(portalContent, document.body)
}

export { MenubarContent }
