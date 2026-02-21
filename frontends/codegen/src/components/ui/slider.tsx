"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  onValueChange,
  onValueCommit,
  orientation = "horizontal",
  ...props
}: Omit<ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "min" | "max" | "step"> & {
  value?: number[]
  defaultValue?: number[]
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number[]) => void
  onValueCommit?: (value: number[]) => void
  orientation?: "horizontal" | "vertical"
}) {
  const currentValue = value?.[0] ?? defaultValue?.[0] ?? min

  return (
    <div
      data-slot="slider"
      data-orientation={orientation}
      data-disabled={disabled || undefined}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => {
          const val = Number(e.target.value)
          onValueChange?.([val])
        }}
        onMouseUp={(e) => {
          const val = Number((e.target as HTMLInputElement).value)
          onValueCommit?.([val])
        }}
        onTouchEnd={(e) => {
          const val = Number((e.target as HTMLInputElement).value)
          onValueCommit?.([val])
        }}
        {...props}
      />
      <div
        data-slot="slider-track"
        data-orientation={orientation}
        className={cn(
          "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        <div
          data-slot="slider-range"
          data-orientation={orientation}
          className={cn(
            "bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
          style={
            orientation === "horizontal"
              ? { width: `${((currentValue - min) / (max - min)) * 100}%` }
              : { height: `${((currentValue - min) / (max - min)) * 100}%` }
          }
        />
      </div>
      <div
        data-slot="slider-thumb"
        className="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        style={
          orientation === "horizontal"
            ? {
                position: "absolute",
                left: `${((currentValue - min) / (max - min)) * 100}%`,
                transform: "translateX(-50%)",
              }
            : {
                position: "absolute",
                bottom: `${((currentValue - min) / (max - min)) * 100}%`,
                transform: "translateY(50%)",
              }
        }
      />
    </div>
  )
}

export { Slider }
