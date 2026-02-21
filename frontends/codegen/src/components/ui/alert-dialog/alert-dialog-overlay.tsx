"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"
import { useAlertDialogContext } from "./alert-dialog"

function AlertDialogOverlay({
  className,
  ...props
}: ComponentProps<"div">) {
  const { open } = useAlertDialogContext()
  if (!open) return null
  return (
    <div
      data-slot="alert-dialog-overlay"
      data-state={open ? "open" : "closed"}
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

export { AlertDialogOverlay }
