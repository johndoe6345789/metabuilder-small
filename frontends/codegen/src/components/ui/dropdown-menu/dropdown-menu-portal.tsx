"use client"

import { type ReactNode } from "react"
import { createPortal } from "react-dom"

function DropdownMenuPortal({
  children,
  container,
}: {
  children?: ReactNode
  container?: Element | null
}) {
  if (typeof document === "undefined") return null
  return createPortal(
    <div data-slot="dropdown-menu-portal">{children}</div>,
    container ?? document.body
  )
}

export { DropdownMenuPortal }
