import { createContext, RefObject } from "react"

import type { CarouselProps } from "./carousel-types"

type CarouselContextProps = {
  carouselRef: RefObject<HTMLDivElement | null>
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = createContext<CarouselContextProps | null>(null)

export type { CarouselContextProps }
export { CarouselContext }
