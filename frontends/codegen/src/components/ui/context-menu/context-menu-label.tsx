"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

function ContextMenuLabel({
  className,
  inset,
  ...props
}: ComponentProps<"div"> & {
  inset?: boolean
}) {
  return (
    <div
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        "text-foreground px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

export { ContextMenuLabel }
