"use client"

import {
  ComponentProps,
  createContext,
  useContext,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"

const TooltipProviderContext = createContext<{
  delayDuration: number
}>({
  delayDuration: 0,
})

function TooltipProvider({
  delayDuration = 0,
  children,
}: {
  delayDuration?: number
  children?: React.ReactNode
}) {
  return (
    <TooltipProviderContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipProviderContext.Provider>
  )
}

const TooltipContext = createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}>({
  open: false,
  onOpenChange: () => {},
  triggerRef: { current: null },
})

function Tooltip({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const triggerRef = useRef<HTMLElement | null>(null)

  const handleOpenChange = (value: boolean) => {
    setUncontrolledOpen(value)
    onOpenChange?.(value)
  }

  return (
    <TooltipProvider>
      <TooltipContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange, triggerRef }}>
        <span data-slot="tooltip" style={{ display: "contents" }}>
          {children}
        </span>
      </TooltipContext.Provider>
    </TooltipProvider>
  )
}

function TooltipTrigger({
  children,
  className,
  asChild,
  ...props
}: ComponentProps<"span"> & { asChild?: boolean }) {
  const { onOpenChange, triggerRef } = useContext(TooltipContext)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const { delayDuration } = useContext(TooltipProviderContext)

  return (
    <span
      data-slot="tooltip-trigger"
      ref={(el) => { triggerRef.current = el }}
      className={className}
      style={{ display: "inline-flex" }}
      onMouseEnter={() => {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => onOpenChange(true), delayDuration)
      }}
      onMouseLeave={() => {
        clearTimeout(timeoutRef.current)
        onOpenChange(false)
      }}
      onFocus={() => {
        clearTimeout(timeoutRef.current)
        onOpenChange(true)
      }}
      onBlur={() => {
        clearTimeout(timeoutRef.current)
        onOpenChange(false)
      }}
      {...props}
    >
      {children}
    </span>
  )
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: ComponentProps<"div"> & {
  sideOffset?: number
  side?: "top" | "bottom" | "left" | "right"
}) {
  const { open } = useContext(TooltipContext)

  if (!open) return null

  return (
    <div
      data-slot="tooltip-content"
      data-state={open ? "open" : "closed"}
      data-side="bottom"
      role="tooltip"
      className={cn(
        "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance",
        className
      )}
      style={{ marginTop: sideOffset }}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
