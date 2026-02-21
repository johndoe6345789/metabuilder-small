"use client"

import { ComponentProps, useState } from "react"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  src,
  alt,
  onLoadingStatusChange,
  ...props
}: ComponentProps<"img"> & {
  onLoadingStatusChange?: (status: "loading" | "loaded" | "error") => void
}) {
  const [hasError, setHasError] = useState(false)

  if (hasError || !src) {
    return null
  }

  return (
    <img
      data-slot="avatar-image"
      src={src}
      alt={alt}
      className={cn("aspect-square size-full", className)}
      onLoad={() => onLoadingStatusChange?.("loaded")}
      onError={() => {
        setHasError(true)
        onLoadingStatusChange?.("error")
      }}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
