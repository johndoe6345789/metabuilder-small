import { cloneElement, ComponentProps, isValidElement, ReactNode } from "react"

import { useFormField } from "./use-form-field"

function Slot({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) {
  if (isValidElement(children)) return cloneElement(children, { ...props, ...(children.props || {}) })
  return <>{children}</>
}

function FormControl({ ...props }: ComponentProps<"div"> & { children?: ReactNode }) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
}

export { FormControl }
