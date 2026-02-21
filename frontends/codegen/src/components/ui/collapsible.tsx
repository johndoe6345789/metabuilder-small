"use client"

import { ComponentProps, createContext, useContext, useState } from "react"

import { cn } from "@/lib/utils"

const CollapsibleContext = createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

function Collapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<"div"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen

  const handleOpenChange = (value: boolean) => {
    if (disabled) return
    setUncontrolledOpen(value)
    onOpenChange?.(value)
  }

  return (
    <CollapsibleContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      <div
        data-slot="collapsible"
        data-state={isOpen ? "open" : "closed"}
        data-disabled={disabled || undefined}
        className={className}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

function CollapsibleTrigger({
  children,
  className,
  ...props
}: ComponentProps<"button">) {
  const { open, onOpenChange } = useContext(CollapsibleContext)

  return (
    <button
      type="button"
      data-slot="collapsible-trigger"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      onClick={() => onOpenChange(!open)}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}

function CollapsibleContent({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  const { open } = useContext(CollapsibleContext)

  if (!open) return null

  return (
    <div
      data-slot="collapsible-content"
      data-state={open ? "open" : "closed"}
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
