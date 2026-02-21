"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export { AlertDialogDescription }
