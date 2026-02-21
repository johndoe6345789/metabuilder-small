"use client"

import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

import { useCarousel } from "./use-carousel"

function CarouselContent({ className, ...props }: ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className={cn(
        "flex overflow-hidden scroll-smooth snap-mandatory",
        orientation === "horizontal" ? "snap-x -ml-4" : "snap-y -mt-4 flex-col",
      )}
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex",
          orientation === "horizontal" ? "" : "flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { CarouselContent }
