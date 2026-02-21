"use client"

import { ComponentProps } from "react"

import { useAlertDialogContext } from "./alert-dialog"

function AlertDialogTrigger({
  children,
  asChild,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const { onOpenChange } = useAlertDialogContext()
  return (
    <button
      type="button"
      data-slot="alert-dialog-trigger"
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  )
}

export { AlertDialogTrigger }
