"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

function NavigationMenuList({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className
      )}
      {...props}
    />
  )
}

export { NavigationMenuList }
