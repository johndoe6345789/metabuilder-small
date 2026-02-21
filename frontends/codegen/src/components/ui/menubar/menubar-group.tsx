"use client"

import { type ComponentProps } from "react"

function MenubarGroup({
  ...props
}: ComponentProps<"div">) {
  return <div data-slot="menubar-group" role="group" {...props} />
}

export { MenubarGroup }
