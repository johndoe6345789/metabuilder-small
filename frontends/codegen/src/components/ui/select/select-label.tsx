"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

function SelectLabel({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  )
}

export { SelectLabel }
