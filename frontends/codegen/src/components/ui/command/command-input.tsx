"use client"

import { ComponentProps, useCallback } from "react"
import { Search } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"

import { useCommandContext } from "./command"

function CommandInput({
  className,
  value,
  onValueChange,
  ...props
}: ComponentProps<"input"> & {
  onValueChange?: (value: string) => void
}) {
  const { search, setSearch } = useCommandContext()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setSearch(val)
      onValueChange?.(val)
    },
    [setSearch, onValueChange]
  )

  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-9 items-center gap-2 border-b px-3"
    >
      <Search className="size-4 shrink-0 opacity-50" />
      <input
        data-slot="command-input"
        type="text"
        value={value !== undefined ? value : search}
        onChange={handleChange}
        className={cn(
          "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { CommandInput }
