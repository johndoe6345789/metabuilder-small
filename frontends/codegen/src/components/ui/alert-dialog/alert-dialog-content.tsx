"use client"

import { ComponentProps, useEffect } from "react"

import { cn } from "@/lib/utils"
import { useAlertDialogContext } from "./alert-dialog"
import { AlertDialogOverlay } from "./alert-dialog-overlay"
import { AlertDialogPortal } from "./alert-dialog-portal"

function AlertDialogContent({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { open, onOpenChange } = useAlertDialogContext()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <div
        role="alertdialog"
        aria-modal="true"
        data-slot="alert-dialog-content"
        data-state={open ? "open" : "closed"}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AlertDialogPortal>
  )
}

export { AlertDialogContent }
