"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

import { useContextMenuContext } from "./context-menu"
import { useContextMenuRadioGroupContext } from "./context-menu-radio-group"

function ContextMenuRadioItem({
  className,
  children,
  value,
  disabled,
  onClick,
  ...props
}: ComponentProps<"div"> & {
  value: string
  disabled?: boolean
}) {
  const { setOpen } = useContextMenuContext()
  const radioGroup = useContextMenuRadioGroupContext()
  const checked = radioGroup.value === value

  return (
    <div
      data-slot="context-menu-radio-item"
      role="menuitemradio"
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
        radioGroup.onValueChange?.(value)
        onClick?.(e)
        setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (!disabled) {
            radioGroup.onValueChange?.(value)
            setOpen(false)
          }
        }
      }}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        {checked && (
          <span className="size-2 rounded-full bg-current fill-current" />
        )}
      </span>
      {children}
    </div>
  )
}

export { ContextMenuRadioItem }
