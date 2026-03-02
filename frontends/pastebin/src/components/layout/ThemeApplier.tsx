'use client'

import { useEffect } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectTheme } from '@/store/selectors'

export function ThemeApplier() {
  const theme = useAppSelector(selectTheme)

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [theme])

  return null
}
