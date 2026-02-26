"use client"

import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useState,
  useCallback,
  useEffect,
  ComponentProps,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { X } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

// Inline Slot: renders child element with merged props (avoids extra DOM wrapper)
const Slot = forwardRef<HTMLElement, HTMLAttributes<HTMLElement> & { children?: ReactNode }>(
  function Slot({ children, ...slotProps }, forwardedRef) {
    const child = Children.only(children)
    if (!isValidElement(child)) return null
    const childProps = child.props as Record<string, unknown>
    const mergedProps: Record<string, unknown> = { ...slotProps }
    if (slotProps.className || childProps.className) {
      mergedProps.className = cn(childProps.className as string | undefined, slotProps.className)
    }
    for (const key of Object.keys(slotProps)) {
      if (key.startsWith("on") && typeof (slotProps as Record<string, unknown>)[key] === "function") {
        const slotHandler = (slotProps as Record<string, unknown>)[key] as (...args: unknown[]) => void
        const childHandler = childProps[key]
        if (typeof childHandler === "function") {
          mergedProps[key] = (...args: unknown[]) => { slotHandler(...args); (childHandler as (...a: unknown[]) => void)(...args) }
        }
      }
    }
    if (forwardedRef) mergedProps.ref = forwardedRef
    return cloneElement(child as ReactElement<any>, mergedProps)
  }
)

// --- Context ---

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    throw new Error("Dialog compound components must be used within <Dialog>")
  }
  return ctx
}

// --- Root ---

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children?: ReactNode
}

function Dialog({ open: controlledOpen, onOpenChange, defaultOpen = false, children }: DialogProps) {
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
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div data-slot="dialog">{children}</div>
    </DialogContext.Provider>
  )
}

// --- Trigger ---

function DialogTrigger({
  children,
  asChild,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const { onOpenChange } = useDialogContext()
  const handleClick = useCallback(() => onOpenChange(true), [onOpenChange])
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      type={asChild ? undefined : "button"}
      data-slot="dialog-trigger"
      onClick={handleClick}
      {...props}
    >
      {children}
    </Comp>
  )
}

// --- Portal ---

function DialogPortal({ children }: { children?: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return createPortal(
    <div data-slot="dialog-portal">{children}</div>,
    document.body
  )
}

// --- Close ---

function DialogClose({
  children,
  asChild,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const { onOpenChange } = useDialogContext()
  const handleClick = useCallback(() => onOpenChange(false), [onOpenChange])
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      type={asChild ? undefined : "button"}
      data-slot="dialog-close"
      onClick={handleClick}
      {...props}
    >
      {children}
    </Comp>
  )
}

// --- Overlay ---

function DialogOverlay({
  className,
  ...props
}: ComponentProps<"div">) {
  const { open, onOpenChange } = useDialogContext()
  if (!open) return null
  return (
    <div
      data-slot="dialog-overlay"
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

function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { open, onOpenChange } = useDialogContext()

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
    <DialogPortal>
      <DialogOverlay />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        data-state={open ? "open" : "closed"}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          data-state={open ? "open" : "closed"}
          onClick={() => onOpenChange(false)}
        >
          <X />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </DialogPortal>
  )
}

// --- Header ---

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

// --- Footer ---

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

// --- Title ---

function DialogTitle({
  className,
  ...props
}: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

// --- Description ---

function DialogDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
