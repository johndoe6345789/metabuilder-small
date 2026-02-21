"use client"

import { useState, useEffect, ReactNode } from "react"
import { createPortal } from "react-dom"

function AlertDialogPortal({ children }: { children?: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return createPortal(
    <div data-slot="alert-dialog-portal">{children}</div>,
    document.body
  )
}

export { AlertDialogPortal }
