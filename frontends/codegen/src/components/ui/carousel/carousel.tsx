"use client"

import {
  ComponentProps,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"

import { CarouselContext, type CarouselContextProps } from "./carousel-context"
import type { CarouselApi, CarouselProps } from "./carousel-types"

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: ComponentProps<"div"> & CarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = carouselRef.current
    if (!el) return

    if (orientation === "horizontal") {
      setCanScrollPrev(el.scrollLeft > 0)
      setCanScrollNext(
        el.scrollLeft < el.scrollWidth - el.clientWidth - 1
      )
    } else {
      setCanScrollPrev(el.scrollTop > 0)
      setCanScrollNext(
        el.scrollTop < el.scrollHeight - el.clientHeight - 1
      )
    }
  }, [orientation])

  const scrollPrev = useCallback(() => {
    const el = carouselRef.current
    if (!el) return
    const scrollAmount = orientation === "horizontal" ? el.clientWidth : el.clientHeight
    el.scrollBy({
      [orientation === "horizontal" ? "left" : "top"]: -scrollAmount,
      behavior: "smooth",
    })
  }, [orientation])

  const scrollNext = useCallback(() => {
    const el = carouselRef.current
    if (!el) return
    const scrollAmount = orientation === "horizontal" ? el.clientWidth : el.clientHeight
    el.scrollBy({
      [orientation === "horizontal" ? "left" : "top"]: scrollAmount,
      behavior: "smooth",
    })
  }, [orientation])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext]
  )

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return

    updateScrollState()

    el.addEventListener("scroll", updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)

    return () => {
      el.removeEventListener("scroll", updateScrollState)
      observer.disconnect()
    }
  }, [updateScrollState])

  useEffect(() => {
    if (!setApi) return
    const el = carouselRef.current
    if (!el) return

    const api: CarouselApi = {
      scrollTo: (index: number) => {
        const items = el.children
        if (items[index]) {
          (items[index] as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "start",
          })
        }
      },
      canScrollPrev: () => canScrollPrev,
      canScrollNext: () => canScrollNext,
      selectedScrollSnap: () => {
        const items = Array.from(el.children)
        const scrollPos = orientation === "horizontal" ? el.scrollLeft : el.scrollTop
        let closest = 0
        let minDist = Infinity
        items.forEach((item, i) => {
          const pos = orientation === "horizontal"
            ? (item as HTMLElement).offsetLeft
            : (item as HTMLElement).offsetTop
          const dist = Math.abs(pos - scrollPos)
          if (dist < minDist) {
            minDist = dist
            closest = i
          }
        })
        return closest
      },
      scrollSnapList: () => {
        return Array.from(el.children).map((_, i) => i)
      },
    }
    setApi(api)
  }, [setApi, canScrollPrev, canScrollNext, orientation])

  return (
    <CarouselContext.Provider
      value={
        {
          carouselRef,
          opts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        } as CarouselContextProps
      }
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

export { Carousel }
