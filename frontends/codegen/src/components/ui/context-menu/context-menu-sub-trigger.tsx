"use client"

import { type ComponentProps, useRef } from "react"
import { ChevronRight } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

import { useContextMenuSubContext } from "./context-menu-sub"

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ComponentProps<"div"> & {
  inset?: boolean
}) {
  const { open, setOpen } = useContextMenuSubContext()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <div
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      data-state={open ? "open" : "closed"}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      tabIndex={-1}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setOpen(true)
      }}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(() => setOpen(false), 150)
      }}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault()
          setOpen(true)
        }
      }}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto" />
    </div>
  )
}

export { ContextMenuSubTrigger }
