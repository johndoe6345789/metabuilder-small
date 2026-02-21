"use client"

import { ComponentProps, createContext, useContext } from "react"
import { Check } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

const RadioGroupContext = createContext<{
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
}>({})

function RadioGroup({
  className,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled,
  ...props
}: ComponentProps<"div"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
}) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name, disabled }}>
      <div
        role="radiogroup"
        data-slot="radio-group"
        className={cn("grid gap-3", className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
}

function RadioGroupItem({
  className,
  value,
  disabled,
  ...props
}: Omit<ComponentProps<"button">, "value"> & {
  value: string
}) {
  const context = useContext(RadioGroupContext)
  const isChecked = context.value === value
  const isDisabled = disabled || context.disabled

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      data-slot="radio-group-item"
      data-state={isChecked ? "checked" : "unchecked"}
      disabled={isDisabled}
      onClick={() => context.onValueChange?.(value)}
      className={cn(
        "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {isChecked && (
        <span
          data-slot="radio-group-indicator"
          className="relative flex items-center justify-center"
        >
          <Check className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
        </span>
      )}
      {context.name && (
        <input
          type="radio"
          aria-hidden
          tabIndex={-1}
          checked={isChecked}
          name={context.name}
          value={value}
          onChange={() => {}}
          style={{
            position: "absolute",
            pointerEvents: "none",
            opacity: 0,
            margin: 0,
            width: 0,
            height: 0,
          }}
        />
      )}
    </button>
  )
}

export { RadioGroup, RadioGroupItem }
