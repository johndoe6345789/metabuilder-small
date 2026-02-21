"use client"

import { ComponentProps } from "react"

function CommandEmpty({
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      role="presentation"
      {...props}
    />
  )
}

export { CommandEmpty }
