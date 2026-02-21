"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

import { useDropdownMenuContext } from "./dropdown-menu"

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  disabled,
  onClick,
  children,
  ...props
}: ComponentProps<"div"> & {
  inset?: boolean
  variant?: "default" | "destructive"
  disabled?: boolean
}) {
  const { setOpen } = useDropdownMenuContext()

  return (
    <div
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      data-disabled={disabled || undefined}
      role="menuitem"
      tabIndex={disabled ? undefined : -1}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onClick={(e) => {
        if (disabled) return
        onClick?.(e)
        setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (!disabled) {
            ;(e.target as HTMLElement).click()
          }
        }
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export { DropdownMenuItem }
