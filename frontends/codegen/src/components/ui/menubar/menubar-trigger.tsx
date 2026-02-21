"use client"

import { type ComponentProps, useRef } from "react"

import { cn } from "@/lib/utils"

import { useMenubarContext } from "./menubar"
import { useMenubarMenuContext } from "./menubar-menu"

function MenubarTrigger({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  const { activeMenu, setActiveMenu } = useMenubarContext()
  const { menuId } = useMenubarMenuContext()
  const isOpen = activeMenu === menuId

  return (
    <button
      type="button"
      data-slot="menubar-trigger"
      data-state={isOpen ? "open" : "closed"}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none",
        className
      )}
      onClick={() => setActiveMenu(isOpen ? null : menuId)}
      onMouseEnter={() => {
        if (activeMenu !== null && activeMenu !== menuId) {
          setActiveMenu(menuId)
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export { MenubarTrigger }
