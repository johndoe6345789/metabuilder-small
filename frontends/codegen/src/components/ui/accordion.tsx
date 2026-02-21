"use client"

import { ComponentProps, createContext, useContext, useState } from "react"
import { ChevronDown } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

const AccordionContext = createContext<{
  value: string[]
  onToggle: (itemValue: string) => void
  type: "single" | "multiple"
}>({
  value: [],
  onToggle: () => {},
  type: "single",
})

const AccordionItemContext = createContext<{
  value: string
  isOpen: boolean
}>({
  value: "",
  isOpen: false,
})

function Accordion({
  type = "single",
  value: controlledValue,
  defaultValue,
  onValueChange,
  collapsible,
  children,
  className,
  ...props
}: ComponentProps<"div"> & {
  type?: "single" | "multiple"
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
}) {
  const normalizeValue = (val?: string | string[]): string[] => {
    if (!val) return []
    return Array.isArray(val) ? val : [val]
  }

  const [uncontrolledValue, setUncontrolledValue] = useState<string[]>(
    normalizeValue(defaultValue)
  )

  const currentValue =
    controlledValue !== undefined
      ? normalizeValue(controlledValue)
      : uncontrolledValue

  const onToggle = (itemValue: string) => {
    let newValue: string[]

    if (type === "single") {
      if (currentValue.includes(itemValue) && collapsible) {
        newValue = []
      } else if (currentValue.includes(itemValue)) {
        return
      } else {
        newValue = [itemValue]
      }
    } else {
      if (currentValue.includes(itemValue)) {
        newValue = currentValue.filter((v) => v !== itemValue)
      } else {
        newValue = [...currentValue, itemValue]
      }
    }

    setUncontrolledValue(newValue)
    if (type === "single") {
      onValueChange?.(newValue[0] ?? "")
    } else {
      onValueChange?.(newValue)
    }
  }

  return (
    <AccordionContext.Provider value={{ value: currentValue, onToggle, type }}>
      <div data-slot="accordion" className={className} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

function AccordionItem({
  className,
  value,
  children,
  ...props
}: ComponentProps<"div"> & {
  value: string
}) {
  const { value: openValues } = useContext(AccordionContext)
  const isOpen = openValues.includes(value)

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div
        data-slot="accordion-item"
        data-state={isOpen ? "open" : "closed"}
        className={cn("border-b last:border-b-0", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  const { onToggle } = useContext(AccordionContext)
  const { value, isOpen } = useContext(AccordionItemContext)

  return (
    <h3 className="flex">
      <button
        type="button"
        data-slot="accordion-trigger"
        data-state={isOpen ? "open" : "closed"}
        aria-expanded={isOpen}
        onClick={() => onToggle(value)}
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </button>
    </h3>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { isOpen } = useContext(AccordionItemContext)

  return (
    <div
      data-slot="accordion-content"
      data-state={isOpen ? "open" : "closed"}
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      hidden={!isOpen}
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
