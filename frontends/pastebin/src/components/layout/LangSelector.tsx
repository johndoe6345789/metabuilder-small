'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, Check } from '@phosphor-icons/react'
import { useAppDispatch, useAppSelector, setLocale } from '@/store/exports'
import type { AppLocale } from '@/store/slices/uiSlice'
import styles from './lang-selector.module.scss'

const LANGS: { code: AppLocale; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
]

export function LangSelector() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dispatch = useAppDispatch()
  const locale = useAppSelector(state => state.ui.locale ?? 'en')

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={styles.root} ref={ref} data-testid="lang-selector">
      <button
        className={styles.trigger}
        onClick={() => setOpen(v => !v)}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid="lang-trigger"
      >
        <Globe size={16} aria-hidden="true" />
        <span>{locale.toUpperCase()}</span>
      </button>

      {open && (
        <div className={styles.panel} role="listbox" aria-label="Language">
          {LANGS.map(lang => (
            <button
              key={lang.code}
              role="option"
              aria-selected={locale === lang.code}
              className={locale === lang.code ? styles.optionActive : styles.option}
              onClick={() => { dispatch(setLocale(lang.code)); setOpen(false) }}
              data-testid={`lang-option-${lang.code}`}
            >
              <span className={styles.optionLabel}>{lang.native}</span>
              <span className={styles.optionSub}>{lang.label}</span>
              {locale === lang.code && <Check size={14} weight="bold" className={styles.check} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
