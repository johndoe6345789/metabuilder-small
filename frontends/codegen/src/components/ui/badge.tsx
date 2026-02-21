import { cloneElement, isValidElement, ReactNode, ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Slot({ children, ...props }: { children?: ReactNode } & Record<string, any>) {
  if (isValidElement(children)) {
    return cloneElement(children, { ...props, ...(children.props || {}) })
  }
  return <>{children}</>
}

const variantClasses = {
  default:
    "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
  destructive:
    "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
  outline:
    "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
} as const

type BadgeVariant = keyof typeof variantClasses

const baseClasses =
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden"

function badgeVariants({
  variant = "default",
  className,
}: {
  variant?: BadgeVariant | null
  className?: string
} = {}) {
  return cn(
    baseClasses,
    variantClasses[variant ?? "default"],
    className
  )
}

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<"span"> & {
  variant?: BadgeVariant | null
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
