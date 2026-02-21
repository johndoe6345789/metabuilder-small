import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const variantClasses = {
  default: "bg-transparent",
  outline:
    "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
} as const

const sizeClasses = {
  default: "h-9 px-2 min-w-9",
  sm: "h-8 px-1.5 min-w-8",
  lg: "h-10 px-2.5 min-w-10",
} as const

type ToggleVariant = keyof typeof variantClasses
type ToggleSize = keyof typeof sizeClasses

function toggleVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ToggleVariant
  size?: ToggleSize
  className?: string
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
    variantClasses[variant],
    sizeClasses[size],
    className
  )
}

function Toggle({
  className,
  variant,
  size,
  pressed,
  defaultPressed = false,
  onPressedChange,
  children,
  ...props
}: Omit<ComponentProps<"button">, "onChange"> & {
    variant?: ToggleVariant
    size?: ToggleSize
    pressed?: boolean
    defaultPressed?: boolean
    onPressedChange?: (pressed: boolean) => void
  }) {
  const isPressed = pressed ?? defaultPressed

  return (
    <button
      type="button"
      data-slot="toggle"
      aria-pressed={isPressed}
      data-state={isPressed ? "on" : "off"}
      onClick={() => onPressedChange?.(!isPressed)}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </button>
  )
}

export { Toggle, toggleVariants }
export type { ToggleVariant, ToggleSize }
