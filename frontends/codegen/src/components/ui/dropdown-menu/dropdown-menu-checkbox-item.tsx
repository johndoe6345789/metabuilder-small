"use client"

import { type ComponentProps } from "react"
import { Check } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

import { useDropdownMenuContext } from "./dropdown-menu"

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  onCheckedChange,
  disabled,
  onClick,
  ...props
}: ComponentProps<"div"> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}) {
  const { setOpen } = useDropdownMenuContext()

  return (
    <div
      data-slot="dropdown-menu-checkbox-item"
      role="menuitemcheckbox"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled || undefined}
      tabIndex={disabled ? undefined : -1}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onClick={(e) => {
        if (disabled) return
        onCheckedChange?.(!checked)
        onClick?.(e)
        setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (!disabled) {
            onCheckedChange?.(!checked)
            setOpen(false)
          }
        }
      }}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        {checked && <Check className="size-4" />}
      </span>
      {children}
    </div>
  )
}

export { DropdownMenuCheckboxItem }
