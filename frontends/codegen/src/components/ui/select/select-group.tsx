"use client"

import { type ComponentProps } from "react"

function SelectGroup({
  ...props
}: ComponentProps<"div">) {
  return <div role="group" data-slot="select-group" {...props} />
}

export { SelectGroup }
