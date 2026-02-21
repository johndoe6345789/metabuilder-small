"use client"

import {
  ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"

const PopoverContext = createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}>({
  open: false,
  onOpenChange: () => {},
  triggerRef: { current: null },
})

function Popover({
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

  const handleOpenChange = useCallback(
    (value: boolean) => {
      setUncontrolledOpen(value)
      onOpenChange?.(value)
    },
    [onOpenChange]
  )

  return (
    <PopoverContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange, triggerRef }}>
      <span data-slot="popover" style={{ display: "contents" }}>
        {children}
      </span>
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({
  children,
  className,
  asChild,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const { open, onOpenChange, triggerRef } = useContext(PopoverContext)

  return (
    <button
      type="button"
      data-slot="popover-trigger"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      ref={(el) => { triggerRef.current = el }}
      onClick={() => onOpenChange(!open)}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
  ...props
}: ComponentProps<"div"> & {
  align?: "start" | "center" | "end"
  sideOffset?: number
  side?: "top" | "bottom" | "left" | "right"
}) {
  const { open, onOpenChange } = useContext(PopoverContext)
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      data-slot="popover-content"
      data-state={open ? "open" : "closed"}
      data-side="bottom"
      data-align={align}
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md outline-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function PopoverAnchor({
  ...props
}: ComponentProps<"div">) {
  return <div data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
