"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function CommandList({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="command-list"
      role="listbox"
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

export { CommandList }
