"use client"

import { ComponentProps, createContext, useContext, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const HoverCardContext = createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}>({
  open: false,
  onOpenChange: () => {},
  triggerRef: { current: null },
})

function HoverCard({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  openDelay = 700,
  closeDelay = 300,
  children,
  ...props
}: ComponentProps<"div"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  openDelay?: number
  closeDelay?: number
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const triggerRef = useRef<HTMLElement | null>(null)

  const handleOpenChange = (value: boolean) => {
    setUncontrolledOpen(value)
    onOpenChange?.(value)
  }

  return (
    <HoverCardContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange, triggerRef }}>
      <div data-slot="hover-card" style={{ display: "contents" }} {...props}>
        {children}
      </div>
    </HoverCardContext.Provider>
  )
}

function HoverCardTrigger({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  const { onOpenChange, triggerRef } = useContext(HoverCardContext)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  return (
    <div
      data-slot="hover-card-trigger"
      ref={(el) => { triggerRef.current = el }}
      className={className}
      style={{ display: "inline-block" }}
      onMouseEnter={() => {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => onOpenChange(true), 200)
      }}
      onMouseLeave={() => {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => onOpenChange(false), 300)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
  ...props
}: ComponentProps<"div"> & {
  align?: "start" | "center" | "end"
  sideOffset?: number
}) {
  const { open, onOpenChange } = useContext(HoverCardContext)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  if (!open) return null

  return (
    <div
      data-slot="hover-card-content"
      data-state={open ? "open" : "closed"}
      data-side="bottom"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 rounded-md border p-4 shadow-md outline-hidden",
        className
      )}
      onMouseEnter={() => {
        clearTimeout(timeoutRef.current)
      }}
      onMouseLeave={() => {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => onOpenChange(false), 300)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
