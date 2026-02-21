"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useAlertDialogContext } from "./alert-dialog"

function AlertDialogCancel({
  className,
  onClick,
  ...props
}: ComponentProps<"button">) {
  const { onOpenChange } = useAlertDialogContext()
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant: "outline" }), className)}
      onClick={(e) => {
        onClick?.(e)
        onOpenChange(false)
      }}
      {...props}
    />
  )
}

export { AlertDialogCancel }
