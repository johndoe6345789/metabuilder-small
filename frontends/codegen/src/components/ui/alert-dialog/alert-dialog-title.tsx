"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

export { AlertDialogTitle }
