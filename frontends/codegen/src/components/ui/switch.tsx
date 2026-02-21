"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Switch({
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
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  required?: boolean
}) {
  const isChecked = checked ?? false

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      data-slot="switch"
      data-state={isChecked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!isChecked)}
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        data-state={isChecked ? "checked" : "unchecked"}
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      />
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

export { Switch }
