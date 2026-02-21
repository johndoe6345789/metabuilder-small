"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react"

// --- Context ---

interface AlertDialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null)

function useAlertDialogContext() {
  const ctx = useContext(AlertDialogContext)
  if (!ctx) {
    throw new Error(
      "AlertDialog compound components must be used within <AlertDialog>"
    )
  }
  return ctx
}

// --- Root ---

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children?: ReactNode
}

function AlertDialog({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
}: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div data-slot="alert-dialog">{children}</div>
    </AlertDialogContext.Provider>
  )
}

export { AlertDialog, AlertDialogContext, useAlertDialogContext }
export type { AlertDialogContextValue }
