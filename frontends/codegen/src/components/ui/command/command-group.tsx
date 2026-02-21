"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function CommandGroup({
  className,
  heading,
  children,
  ...props
}: ComponentProps<"div"> & {
  heading?: React.ReactNode
}) {
  return (
    <div
      data-slot="command-group"
      role="group"
      className={cn(
        "text-foreground overflow-hidden p-1",
        className
      )}
      {...props}
    >
      {heading && (
        <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
}

export { CommandGroup }
