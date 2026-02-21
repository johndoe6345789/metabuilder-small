import { ComponentProps } from "react"

function AspectRatio({
  ratio = 1,
  style,
  ...props
}: ComponentProps<"div"> & {
  ratio?: number
}) {
  return (
    <div
      data-slot="aspect-ratio"
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: `${100 / ratio}%`,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
        {...props}
      />
    </div>
  )
}

export { AspectRatio }
