"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ComponentProps,
  ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { X } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

// --- Context ---

interface SheetContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SheetContext = createContext<SheetContextValue | null>(null)

function useSheetContext() {
  const ctx = useContext(SheetContext)
  if (!ctx) {
    throw new Error("Sheet compound components must be used within <Sheet>")
  }
  return ctx
}

// --- Root ---

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children?: ReactNode
}

function Sheet({ open: controlledOpen, onOpenChange, defaultOpen = false, children }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <SheetContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div data-slot="sheet">{children}</div>
    </SheetContext.Provider>
  )
}

// --- Trigger ---

function SheetTrigger({
  children,
  asChild,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const { onOpenChange } = useSheetContext()
  return (
    <button
      type="button"
      data-slot="sheet-trigger"
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  )
}

// --- Close ---

function SheetClose({
  children,
  asChild,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const { onOpenChange } = useSheetContext()
  return (
    <button
      type="button"
      data-slot="sheet-close"
      onClick={() => onOpenChange(false)}
      {...props}
    >
      {children}
    </button>
  )
}

// --- Portal ---

function SheetPortal({ children }: { children?: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return createPortal(
    <div data-slot="sheet-portal">{children}</div>,
    document.body
  )
}

// --- Overlay ---

function SheetOverlay({
  className,
  ...props
}: ComponentProps<"div">) {
  const { open, onOpenChange } = useSheetContext()
  if (!open) return null
  return (
    <div
      data-slot="sheet-overlay"
      data-state={open ? "open" : "closed"}
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  )
}

// --- Content ---

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: ComponentProps<"div"> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  const { open, onOpenChange } = useSheetContext()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <SheetPortal>
      <SheetOverlay />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="sheet-content"
        data-state={open ? "open" : "closed"}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
          data-state={open ? "open" : "closed"}
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </SheetPortal>
  )
}

// --- Header ---

function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

// --- Footer ---

function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

// --- Title ---

function SheetTitle({
  className,
  ...props
}: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

// --- Description ---

function SheetDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
