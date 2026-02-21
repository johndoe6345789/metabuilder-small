"use client"

import { ComponentProps } from "react"
import { Check } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
  name,
  value,
  ...props
}: Omit<ComponentProps<"button">, "onChange"> & {
  checked?: boolean | "indeterminate"
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean | "indeterminate") => void
  required?: boolean
}) {
  const isChecked = checked === true || checked === "indeterminate"
  const dataState =
    checked === "indeterminate"
      ? "indeterminate"
      : checked
        ? "checked"
        : "unchecked"

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked === "indeterminate" ? "mixed" : !!checked}
      data-slot="checkbox"
      data-state={dataState}
      disabled={disabled}
      onClick={() => {
        if (checked === "indeterminate") {
          onCheckedChange?.(true)
        } else {
          onCheckedChange?.(!checked)
        }
      }}
      className={cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {isChecked && (
        <span
          data-slot="checkbox-indicator"
          className="flex items-center justify-center text-current transition-none"
        >
          <Check className="size-3.5" />
        </span>
      )}
      {name && (
        <input
          type="checkbox"
          aria-hidden
          tabIndex={-1}
          checked={isChecked}
          name={name}
          value={value}
          required={required}
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

export { Checkbox }
