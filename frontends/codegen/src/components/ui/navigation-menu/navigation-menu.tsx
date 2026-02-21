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

import { NavigationMenuViewport } from "./navigation-menu-viewport"

// --- Context ---

interface NavigationMenuContextValue {
  activeItem: string
  setActiveItem: (item: string) => void
}

const NavigationMenuContext = createContext<NavigationMenuContextValue | null>(null)

export function useNavigationMenuContext() {
  const ctx = useContext(NavigationMenuContext)
  if (!ctx) {
    throw new Error(
      "NavigationMenu compound components must be used within <NavigationMenu>"
    )
  }
  return ctx
}

// --- NavigationMenu ---

interface NavigationMenuProps extends ComponentProps<"nav"> {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  viewport?: boolean
  children?: ReactNode
}

function NavigationMenu({
  className,
  children,
  value: controlledValue,
  onValueChange,
  defaultValue = "",
  viewport = true,
  ...props
}: NavigationMenuProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)

  const isControlled = controlledValue !== undefined
  const activeItem = isControlled ? controlledValue : uncontrolledValue

  const setActiveItem = useCallback(
    (item: string) => {
      if (!isControlled) {
        setUncontrolledValue(item)
      }
      onValueChange?.(item)
    },
    [isControlled, onValueChange]
  )

  return (
    <NavigationMenuContext.Provider value={{ activeItem, setActiveItem }}>
      <nav
        data-slot="navigation-menu"
        data-viewport={viewport}
        className={cn(
          "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
          className
        )}
        {...props}
      >
        {children}
        {viewport && <NavigationMenuViewport />}
      </nav>
    </NavigationMenuContext.Provider>
  )
}

export { NavigationMenu }
