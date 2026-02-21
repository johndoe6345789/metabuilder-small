"use client"

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

import { useSelectContext } from "./select"
import { SelectScrollDownButton } from "./select-scroll-down-button"
import { SelectScrollUpButton } from "./select-scroll-up-button"

interface SelectContentProps extends ComponentProps<"div"> {
  position?: "popper" | "item-aligned"
  children?: ReactNode
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: SelectContentProps) {
  const { open, contentRef, triggerRef } = useSelectContext()
  const innerRef = useRef<HTMLDivElement>(null)

  // Sync refs
  useEffect(() => {
    if (innerRef.current && contentRef) {
      (contentRef as React.MutableRefObject<HTMLDivElement | null>).current =
        innerRef.current
    }
  })

  // Position the dropdown below the trigger
  useEffect(() => {
    if (!open || !innerRef.current || !triggerRef.current) return

    const trigger = triggerRef.current
    const rect = trigger.getBoundingClientRect()

    const content = innerRef.current
    content.style.position = "fixed"
    content.style.top = `${rect.bottom + 4}px`
    content.style.left = `${rect.left}px`
    content.style.minWidth = `${rect.width}px`
  }, [open, triggerRef])

  if (!open) return null

  return createPortal(
    <div
      ref={innerRef}
      data-slot="select-content"
      data-state={open ? "open" : "closed"}
      data-side="bottom"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-[min(var(--radix-select-content-available-height,300px),300px)] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <div
        className={cn(
          "p-1",
          position === "popper" && "w-full scroll-my-1"
        )}
      >
        {children}
      </div>
      <SelectScrollDownButton />
    </div>,
    document.body
  )
}

export { SelectContent }
