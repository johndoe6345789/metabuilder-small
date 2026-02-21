"use client"

import { ComponentProps, useCallback } from "react"

import { cn } from "@/lib/utils"

import { useCommandContext } from "./command"

function CommandItem({
  className,
  value,
  disabled,
  onSelect,
  children,
  ...props
}: ComponentProps<"div"> & {
  value?: string
  disabled?: boolean
  onSelect?: (value: string) => void
}) {
  const { search, selectedValue, setSelectedValue, filter } = useCommandContext()

  const itemValue = value || (typeof children === "string" ? children : "")

  const isFiltered = search
    ? filter
      ? !filter(itemValue, search)
      : !itemValue.toLowerCase().includes(search.toLowerCase())
    : false

  const isSelected = selectedValue === itemValue

  const handleClick = useCallback(() => {
    if (!disabled) {
      setSelectedValue(itemValue)
      onSelect?.(itemValue)
    }
  }, [disabled, itemValue, onSelect, setSelectedValue])

  if (isFiltered) return null

  return (
    <div
      data-slot="command-item"
      data-value={itemValue}
      data-selected={isSelected}
      data-disabled={disabled || undefined}
      role="option"
      aria-selected={isSelected}
      onClick={handleClick}
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { CommandItem }
