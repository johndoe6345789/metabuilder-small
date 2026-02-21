"use client"

import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

import { useMenubarContext } from "./menubar"
import { useMenubarRadioGroupContext } from "./menubar-radio-group"

function MenubarRadioItem({
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
  const { setActiveMenu } = useMenubarContext()
  const radioGroup = useMenubarRadioGroupContext()
  const checked = radioGroup.value === value

  return (
    <div
      data-slot="menubar-radio-item"
      role="menuitemradio"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled || undefined}
      tabIndex={disabled ? undefined : -1}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onClick={(e) => {
        if (disabled) return
        radioGroup.onValueChange?.(value)
        onClick?.(e)
        setActiveMenu(null)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (!disabled) {
            radioGroup.onValueChange?.(value)
            setActiveMenu(null)
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

export { MenubarRadioItem }
