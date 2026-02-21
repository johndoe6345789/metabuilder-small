"use client"

import { type ComponentProps, useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import { useContextMenuSubContext } from "./context-menu-sub"

function ContextMenuSubContent({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { open, setOpen } = useContextMenuSubContext()
  const contentRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "ArrowLeft") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      data-slot="context-menu-sub-content"
      data-state={open ? "open" : "closed"}
      role="menu"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      style={{
        position: "absolute",
        left: "100%",
        top: 0,
      }}
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(() => setOpen(false), 150)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export { ContextMenuSubContent }
