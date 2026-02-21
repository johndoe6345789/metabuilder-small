"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react"

// --- Context ---

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const SelectContext = createContext<SelectContextValue | null>(null)

export function useSelectContext() {
  const ctx = useContext(SelectContext)
  if (!ctx) {
    throw new Error("Select compound components must be used within <Select>")
  }
  return ctx
}

// --- Select ---

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  children?: ReactNode
  name?: string
}

function Select({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const isValueControlled = controlledValue !== undefined
  const isOpenControlled = controlledOpen !== undefined

  const currentValue = isValueControlled ? controlledValue : uncontrolledValue
  const currentOpen = isOpenControlled ? controlledOpen : uncontrolledOpen

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (!isValueControlled) {
        setUncontrolledValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [isValueControlled, onValueChange]
  )

  const handleSetOpen = useCallback(
    (newOpen: boolean) => {
      if (!isOpenControlled) {
        setUncontrolledOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    },
    [isOpenControlled, onOpenChange]
  )

  // Close on click outside
  useEffect(() => {
    if (!currentOpen) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        handleSetOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [currentOpen, handleSetOpen])

  // Close on escape
  useEffect(() => {
    if (!currentOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleSetOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [currentOpen, handleSetOpen])

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        open: currentOpen,
        setOpen: handleSetOpen,
        triggerRef,
        contentRef,
      }}
    >
      <div data-slot="select" className="relative inline-block">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export { Select }
