"use client"

import {
  ComponentProps,
  createContext,
  KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Minus } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

type OTPContextValue = {
  slots: { char: string; isActive: boolean; hasFakeCaret: boolean }[]
  activeIndex: number
}

const OTPContext = createContext<OTPContextValue>({
  slots: [],
  activeIndex: -1,
})

function InputOTP({
  className,
  containerClassName,
  maxLength = 6,
  value: controlledValue,
  onChange,
  onComplete,
  disabled,
  children,
  ...props
}: ComponentProps<"div"> & {
  containerClassName?: string
  maxLength?: number
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
}) {
  const [internalValue, setInternalValue] = useState("")
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const value = controlledValue !== undefined ? controlledValue : internalValue

  const slots = useMemo(() => {
    return Array.from({ length: maxLength }, (_, i) => ({
      char: value[i] || "",
      isActive: i === activeIndex,
      hasFakeCaret: i === value.length && i === activeIndex,
    }))
  }, [value, maxLength, activeIndex])

  const contextValue = useMemo(
    () => ({ slots, activeIndex }),
    [slots, activeIndex]
  )

  const updateValue = useCallback(
    (newValue: string) => {
      const clamped = newValue.slice(0, maxLength)
      if (controlledValue === undefined) {
        setInternalValue(clamped)
      }
      onChange?.(clamped)
      if (clamped.length === maxLength) {
        onComplete?.(clamped)
      }
    },
    [maxLength, controlledValue, onChange, onComplete]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault()
        updateValue(value.slice(0, -1))
      }
    },
    [value, updateValue]
  )

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const input = e.currentTarget
      const newChar = input.value
      if (/^\d*$/.test(newChar) || /^[a-zA-Z0-9]*$/.test(newChar)) {
        updateValue(value + newChar)
      }
      input.value = ""
    },
    [value, updateValue]
  )

  const handleFocus = useCallback(() => {
    setActiveIndex(Math.min(value.length, maxLength - 1))
  }, [value.length, maxLength])

  const handleBlur = useCallback(() => {
    setActiveIndex(-1)
  }, [])

  useEffect(() => {
    setActiveIndex((prev) =>
      prev >= 0 ? Math.min(value.length, maxLength - 1) : prev
    )
  }, [value.length, maxLength])

  return (
    <OTPContext.Provider value={contextValue}>
      <div
        data-slot="input-otp"
        className={cn(
          "flex items-center gap-2 has-disabled:opacity-50",
          containerClassName
        )}
        onClick={() => inputRef.current?.focus()}
        {...props}
      >
        <input
          ref={inputRef}
          className={cn(
            "absolute opacity-0 w-0 h-0 pointer-events-none disabled:cursor-not-allowed",
            className
          )}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete="one-time-code"
          inputMode="numeric"
          aria-label="One-time password input"
        />
        {children}
      </div>
    </OTPContext.Provider>
  )
}

function InputOTPGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: ComponentProps<"div"> & {
  index: number
}) {
  const { slots } = useContext(OTPContext)
  const { char, hasFakeCaret, isActive } = slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <Minus />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
