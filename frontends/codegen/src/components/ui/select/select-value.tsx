"use client"

import { type ComponentProps } from "react"

import { useSelectContext } from "./select"

interface SelectValueProps extends ComponentProps<"span"> {
  placeholder?: string
}

function SelectValue({
  placeholder,
  ...props
}: SelectValueProps) {
  const { value } = useSelectContext()

  return (
    <span
      data-slot="select-value"
      data-placeholder={!value ? "" : undefined}
      {...props}
    >
      {value || placeholder}
    </span>
  )
}

export { SelectValue }
