"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function CommandSeparator({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="command-separator"
      role="separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  )
}

export { CommandSeparator }
