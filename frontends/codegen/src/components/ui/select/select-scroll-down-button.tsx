"use client"

import { type ComponentProps } from "react"

import { ChevronDown } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

function SelectScrollDownButton({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDown className="size-4" />
    </div>
  )
}

export { SelectScrollDownButton }
