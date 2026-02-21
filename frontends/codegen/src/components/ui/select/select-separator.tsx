"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

function SelectSeparator({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

export { SelectSeparator }
