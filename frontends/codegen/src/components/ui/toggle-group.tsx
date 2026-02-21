"use client"

import { ComponentProps, createContext, useContext } from "react"

import { cn } from "@/lib/utils"
import { toggleVariants, type ToggleVariant, type ToggleSize } from "@/components/ui/toggle"

const ToggleGroupContext = createContext<{
  variant?: ToggleVariant
  size?: ToggleSize
  value?: string | string[]
  onValueChange?: (value: string) => void
  type?: "single" | "multiple"
}>({
  size: "default",
  variant: "default",
})

function ToggleGroup({
  className,
  variant,
  size,
  children,
  type = "single",
  value,
  onValueChange,
  ...props
}: ComponentProps<"div"> & {
    variant?: ToggleVariant
    size?: ToggleSize
    type?: "single" | "multiple"
    value?: string | string[]
    onValueChange?: (value: string) => void
  }) {
  return (
    <div
      role="group"
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, value, onValueChange, type }}>
        {children}
      </ToggleGroupContext.Provider>
    </div>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  value,
  ...props
}: ComponentProps<"button"> & {
    variant?: ToggleVariant
    size?: ToggleSize
    value: string
  }) {
  const context = useContext(ToggleGroupContext)

  const isPressed = Array.isArray(context.value)
    ? context.value.includes(value)
    : context.value === value

  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      aria-pressed={isPressed}
      data-state={isPressed ? "on" : "off"}
      onClick={() => context.onValueChange?.(value)}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { ToggleGroup, ToggleGroupItem }
