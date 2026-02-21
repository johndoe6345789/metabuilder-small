"use client"

import { type ComponentProps } from "react"

import { ChevronUp } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

function SelectScrollUpButton({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUp className="size-4" />
    </div>
  )
}

export { SelectScrollUpButton }
