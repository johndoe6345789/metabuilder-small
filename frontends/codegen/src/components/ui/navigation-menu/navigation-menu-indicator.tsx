"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

interface NavigationMenuIndicatorProps extends ComponentProps<"div"> {
  visible?: boolean
}

function NavigationMenuIndicator({
  className,
  visible = true,
  ...props
}: NavigationMenuIndicatorProps) {
  return (
    <div
      data-slot="navigation-menu-indicator"
      data-state={visible ? "visible" : "hidden"}
      className={cn(
        "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="bg-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm shadow-md" />
    </div>
  )
}

export { NavigationMenuIndicator }
