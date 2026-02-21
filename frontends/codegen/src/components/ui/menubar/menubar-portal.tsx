"use client"

import { type ReactNode } from "react"
import { createPortal } from "react-dom"

function MenubarPortal({
  children,
  container,
}: {
  children?: ReactNode
  container?: Element | null
}) {
  if (typeof document === "undefined") return null
  return createPortal(
    <div data-slot="menubar-portal">{children}</div>,
    container ?? document.body
  )
}

export { MenubarPortal }
