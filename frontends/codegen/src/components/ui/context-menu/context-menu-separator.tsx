"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="context-menu-separator"
      role="separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

export { ContextMenuSeparator }
