"use client"

import { type ReactNode } from "react"
import { createPortal } from "react-dom"

function ContextMenuPortal({
  children,
  container,
}: {
  children?: ReactNode
  container?: Element | null
}) {
  if (typeof document === "undefined") return null
  return createPortal(
    <div data-slot="context-menu-portal">{children}</div>,
    container ?? document.body
  )
}

export { ContextMenuPortal }
