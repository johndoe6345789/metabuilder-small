import { ComponentProps } from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

import { useFormField } from "./use-form-field"

function FormLabel({
  className,
  ...props
}: ComponentProps<"label">) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

export { FormLabel }
