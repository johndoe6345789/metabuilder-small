"use client"

import { type ComponentProps } from "react"

function ContextMenuGroup({
  ...props
}: ComponentProps<"div">) {
  return (
    <div data-slot="context-menu-group" role="group" {...props} />
  )
}

export { ContextMenuGroup }
