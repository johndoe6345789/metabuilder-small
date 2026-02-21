"use client"

import { type ComponentProps } from "react"

function DropdownMenuGroup({
  ...props
}: ComponentProps<"div">) {
  return (
    <div data-slot="dropdown-menu-group" role="group" {...props} />
  )
}

export { DropdownMenuGroup }
