"use client"

import { type ComponentProps } from "react"

import { useDropdownMenuContext } from "./dropdown-menu"

function DropdownMenuTrigger({
  children,
  asChild,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()

  return (
    <button
      type="button"
      data-slot="dropdown-menu-trigger"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      aria-haspopup="menu"
      ref={triggerRef}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
    </button>
  )
}

export { DropdownMenuTrigger }
