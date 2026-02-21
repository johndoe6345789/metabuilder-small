"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type ComponentProps,
} from "react"

import { cn } from "@/lib/utils"

// --- Item-level context for trigger/content pairing ---

interface NavigationMenuItemContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  itemRef: React.RefObject<HTMLLIElement | null>
}

const NavigationMenuItemContext = createContext<NavigationMenuItemContextValue | null>(null)

export function useNavigationMenuItemContext() {
  const ctx = useContext(NavigationMenuItemContext)
  if (!ctx) {
    throw new Error(
      "NavigationMenuItem compound components must be used within <NavigationMenuItem>"
    )
  }
  return ctx
}

// --- NavigationMenuItem ---

interface NavigationMenuItemProps extends ComponentProps<"li"> {
  value?: string
  children?: ReactNode
}

function NavigationMenuItem({
  className,
  children,
  ...props
}: NavigationMenuItemProps) {
  const [open, setOpen] = useState(false)
  const itemRef = useRef<HTMLLIElement>(null)

  const handleSetOpen = useCallback((value: boolean) => {
    setOpen(value)
  }, [])

  // Close on click outside
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <NavigationMenuItemContext.Provider
      value={{ open, setOpen: handleSetOpen, itemRef }}
    >
      <li
        ref={itemRef}
        data-slot="navigation-menu-item"
        className={cn("relative", className)}
        {...props}
      >
        {children}
      </li>
    </NavigationMenuItemContext.Provider>
  )
}

export { NavigationMenuItem }
