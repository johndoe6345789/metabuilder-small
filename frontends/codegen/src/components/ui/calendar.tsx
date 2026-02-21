"use client"

import { ComponentProps, useCallback, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "@metabuilder/fakemui/icons"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type CalendarMode = "single" | "range" | "multiple"

type CalendarProps = {
  mode?: CalendarMode
  selected?: Date | Date[] | { from?: Date; to?: Date }
  onSelect?: (date: Date | undefined) => void
  showOutsideDays?: boolean
  className?: string
  classNames?: Record<string, string>
  month?: Date
  onMonthChange?: (date: Date) => void
  disabled?: (date: Date) => boolean
  fromDate?: Date
  toDate?: Date
} & Omit<ComponentProps<"div">, "onSelect">

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isInRange(date: Date, from?: Date, to?: Date): boolean {
  if (!from || !to) return false
  const time = date.getTime()
  return time >= from.getTime() && time <= to.getTime()
}

function Calendar({
  mode = "single",
  selected,
  onSelect,
  showOutsideDays = true,
  className,
  classNames = {},
  month: controlledMonth,
  onMonthChange,
  disabled,
  ...props
}: CalendarProps) {
  const today = useMemo(() => new Date(), [])
  const [internalMonth, setInternalMonth] = useState(
    () => controlledMonth || (selected instanceof Date ? selected : today)
  )

  const displayMonth = controlledMonth || internalMonth
  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth()

  const handleMonthChange = useCallback(
    (newDate: Date) => {
      if (onMonthChange) {
        onMonthChange(newDate)
      } else {
        setInternalMonth(newDate)
      }
    },
    [onMonthChange]
  )

  const goToPrevMonth = useCallback(() => {
    handleMonthChange(new Date(year, month - 1, 1))
  }, [year, month, handleMonthChange])

  const goToNextMonth = useCallback(() => {
    handleMonthChange(new Date(year, month + 1, 1))
  }, [year, month, handleMonthChange])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const daysInPrevMonth = getDaysInMonth(year, month - 1)

  const isSelected = useCallback(
    (date: Date): boolean => {
      if (!selected) return false
      if (selected instanceof Date) return isSameDay(date, selected)
      if (Array.isArray(selected)) return selected.some((d) => isSameDay(date, d))
      if (typeof selected === "object" && "from" in selected) {
        if (selected.from && isSameDay(date, selected.from)) return true
        if (selected.to && isSameDay(date, selected.to)) return true
      }
      return false
    },
    [selected]
  )

  const isRangeMiddle = useCallback(
    (date: Date): boolean => {
      if (mode !== "range" || !selected || typeof selected !== "object" || !("from" in selected))
        return false
      return isInRange(date, selected.from, selected.to) && !isSelected(date)
    },
    [mode, selected, isSelected]
  )

  const isToday = useCallback((date: Date): boolean => isSameDay(date, today), [today])

  const isDisabled = useCallback(
    (date: Date): boolean => {
      if (disabled) return disabled(date)
      return false
    },
    [disabled]
  )

  const weeks: { date: Date; isOutside: boolean }[][] = useMemo(() => {
    const result: { date: Date; isOutside: boolean }[][] = []
    let currentWeek: { date: Date; isOutside: boolean }[] = []

    for (let i = firstDay - 1; i >= 0; i--) {
      currentWeek.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isOutside: true,
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push({
        date: new Date(year, month, day),
        isOutside: false,
      })
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    }

    if (currentWeek.length > 0) {
      let nextDay = 1
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: new Date(year, month + 1, nextDay++),
          isOutside: true,
        })
      }
      result.push(currentWeek)
    }

    return result
  }, [year, month, firstDay, daysInMonth, daysInPrevMonth])

  const monthLabel = displayMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  })

  return (
    <div
      data-slot="calendar"
      className={cn("p-3", className)}
      {...props}
    >
      <div className={cn("flex flex-col gap-4", classNames.month)}>
        <div
          className={cn(
            "flex justify-center pt-1 relative items-center w-full",
            classNames.caption
          )}
        >
          <button
            type="button"
            onClick={goToPrevMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1",
              classNames.nav_button,
              classNames.nav_button_previous
            )}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span
            className={cn("text-sm font-medium", classNames.caption_label)}
          >
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1",
              classNames.nav_button,
              classNames.nav_button_next
            )}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <table
          className={cn(
            "w-full border-collapse space-x-1",
            classNames.table
          )}
        >
          <thead>
            <tr className={cn("flex", classNames.head_row)}>
              {DAYS_OF_WEEK.map((day) => (
                <th
                  key={day}
                  className={cn(
                    "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                    classNames.head_cell
                  )}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIdx) => (
              <tr
                key={weekIdx}
                className={cn("flex w-full mt-2", classNames.row)}
              >
                {week.map(({ date, isOutside }, dayIdx) => {
                  if (isOutside && !showOutsideDays) {
                    return (
                      <td
                        key={dayIdx}
                        className={cn("relative p-0 text-center text-sm w-8 h-8", classNames.cell)}
                      />
                    )
                  }

                  const selected_ = isSelected(date)
                  const today_ = isToday(date)
                  const disabled_ = isDisabled(date)
                  const rangeMiddle = isRangeMiddle(date)

                  return (
                    <td
                      key={dayIdx}
                      className={cn(
                        "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                        selected_ && "[&:has([aria-selected])]:bg-accent",
                        classNames.cell
                      )}
                    >
                      <button
                        type="button"
                        disabled={disabled_}
                        aria-selected={selected_ || undefined}
                        onClick={() => {
                          if (!disabled_ && onSelect) {
                            onSelect(date)
                          }
                        }}
                        className={cn(
                          buttonVariants({ variant: "ghost" }),
                          "size-8 p-0 font-normal aria-selected:opacity-100",
                          selected_ &&
                            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                          today_ && !selected_ && "bg-accent text-accent-foreground",
                          isOutside &&
                            "text-muted-foreground aria-selected:text-muted-foreground",
                          disabled_ && "text-muted-foreground opacity-50",
                          rangeMiddle &&
                            "aria-selected:bg-accent aria-selected:text-accent-foreground",
                          classNames.day
                        )}
                      >
                        {date.getDate()}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { Calendar }
export type { CalendarProps }
