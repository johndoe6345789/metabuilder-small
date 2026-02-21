"use client"

import { type ComponentProps } from "react"

import { Check } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

import { useSelectContext } from "./select"

interface SelectItemProps extends ComponentProps<"div"> {
  value: string
  disabled?: boolean
}

function SelectItem({
  className,
  children,
  value,
  disabled = false,
  ...props
}: SelectItemProps) {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext()
  const isSelected = selectedValue === value

  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-slot="select-item"
      data-disabled={disabled ? "" : undefined}
      data-state={isSelected ? "checked" : "unchecked"}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        !disabled && "hover:bg-accent hover:text-accent-foreground cursor-pointer",
        className
      )}
      onClick={() => {
        if (disabled) return
        onValueChange(value)
        setOpen(false)
      }}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onValueChange(value)
          setOpen(false)
        }
      }}
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        {isSelected && <Check className="size-4" />}
      </span>
      <span>{children}</span>
    </div>
  )
}

export { SelectItem }
