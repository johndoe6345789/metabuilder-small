"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: ComponentProps<"div"> & {
  inset?: boolean
}) {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

export { DropdownMenuLabel }
