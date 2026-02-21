"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      role="separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

export { DropdownMenuSeparator }
