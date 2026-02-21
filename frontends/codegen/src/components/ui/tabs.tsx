"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type ComponentProps,
} from "react"

import { cn } from "@/lib/utils"

// --- Context ---

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) {
    throw new Error("Tabs compound components must be used within <Tabs>")
  }
  return ctx
}

// --- Tabs ---

interface TabsProps extends Omit<ComponentProps<"div">, "defaultValue"> {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  children?: ReactNode
}

function Tabs({
  className,
  value: controlledValue,
  onValueChange,
  defaultValue = "",
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)

  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : uncontrolledValue

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [isControlled, onValueChange]
  )

  return (
    <TabsContext.Provider
      value={{ value: currentValue, onValueChange: handleValueChange }}
    >
      <div
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
}

// --- TabsList ---

function TabsList({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  )
}

// --- TabsTrigger ---

interface TabsTriggerProps extends ComponentProps<"button"> {
  value: string
}

function TabsTrigger({
  className,
  value,
  ...props
}: TabsTriggerProps) {
  const ctx = useTabsContext()
  const isActive = ctx.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-slot="tabs-trigger"
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onClick={() => ctx.onValueChange(value)}
      {...props}
    />
  )
}

// --- TabsContent ---

interface TabsContentProps extends ComponentProps<"div"> {
  value: string
}

function TabsContent({
  className,
  value,
  ...props
}: TabsContentProps) {
  const ctx = useTabsContext()
  const isActive = ctx.value === value

  if (!isActive) return null

  return (
    <div
      role="tabpanel"
      data-slot="tabs-content"
      data-state={isActive ? "active" : "inactive"}
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
