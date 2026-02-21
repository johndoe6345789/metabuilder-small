"use client"

import {
  ComponentProps,
  createContext,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

import { cn } from "@/lib/utils"

type CommandContextValue = {
  search: string
  setSearch: (value: string) => void
  selectedValue: string
  setSelectedValue: (value: string) => void
  filter?: (value: string, search: string) => boolean
}

const CommandContext = createContext<CommandContextValue>({
  search: "",
  setSearch: () => {},
  selectedValue: "",
  setSelectedValue: () => {},
})

function useCommandContext() {
  return useContext(CommandContext)
}

function Command({
  className,
  filter,
  children,
  ...props
}: ComponentProps<"div"> & {
  filter?: (value: string, search: string) => boolean
}) {
  const [search, setSearch] = useState("")
  const [selectedValue, setSelectedValue] = useState("")

  const contextValue = useMemo(
    () => ({ search, setSearch, selectedValue, setSelectedValue, filter }),
    [search, selectedValue, filter]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const items = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        '[data-slot="command-item"]:not([data-disabled="true"])'
      )
      if (!items.length) return

      const values = Array.from(items).map((el) => el.getAttribute("data-value") || "")
      const currentIndex = values.indexOf(selectedValue)

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const next = currentIndex < values.length - 1 ? currentIndex + 1 : 0
        setSelectedValue(values[next])
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const prev = currentIndex > 0 ? currentIndex - 1 : values.length - 1
        setSelectedValue(values[prev])
      } else if (e.key === "Enter") {
        e.preventDefault()
        const selectedItem = items[currentIndex >= 0 ? currentIndex : 0]
        if (selectedItem) selectedItem.click()
      }
    },
    [selectedValue]
  )

  return (
    <CommandContext.Provider value={contextValue}>
      <div
        data-slot="command"
        className={cn(
          "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}

export { Command, CommandContext, useCommandContext }
