"use client"

import { type ComponentProps } from "react"

import { ChevronDown } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

import { useNavigationMenuItemContext } from "./navigation-menu-item"
import { navigationMenuTriggerStyle } from "./navigation-menu-trigger-style"

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  const { open, setOpen } = useNavigationMenuItemContext()

  return (
    <button
      type="button"
      data-slot="navigation-menu-trigger"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      onClick={() => setOpen(!open)}
      onMouseEnter={() => setOpen(true)}
      {...props}
    >
      {children}{" "}
      <ChevronDown
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </button>
  )
}

export { NavigationMenuTrigger }
