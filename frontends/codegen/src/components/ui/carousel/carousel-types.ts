import { RefObject } from "react"

type CarouselApi = {
  scrollTo: (index: number) => void
  canScrollPrev: () => boolean
  canScrollNext: () => boolean
  selectedScrollSnap: () => number
  scrollSnapList: () => number[]
}

type CarouselOptions = {
  align?: "start" | "center" | "end"
  loop?: boolean
  skipSnaps?: boolean
  startIndex?: number
}

type CarouselPlugin = unknown

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

export type { CarouselApi, CarouselOptions, CarouselPlugin, CarouselProps }
