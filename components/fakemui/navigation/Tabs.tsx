import React, { forwardRef } from 'react'
import styles from '../../../scss/atoms/mat-tabs.module.scss'

const s = (key: string): string => styles[key] || key

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  children?: React.ReactNode
  value?: any
  onChange?: (event: React.SyntheticEvent, value: any) => void
  variant?: 'standard' | 'scrollable' | 'fullWidth' | 'secondary' | 'centered'
  fullWidth?: boolean
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ children, value, onChange, variant, fullWidth, className = '', ...props }, ref) => {
    const variantClasses = [
      variant === 'secondary' && styles.secondary,
      variant === 'scrollable' && styles.scrollable,
      variant === 'centered' && styles.centered,
      (variant === 'fullWidth' || fullWidth) && styles.fullWidth,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        ref={ref}
        className={`${s('mat-mdc-tab-group')} ${styles.matTabs} ${variantClasses} ${className}`.trim()}
        role="tablist"
        {...props}
      >
        <div className={s('mat-mdc-tab-header')}>
          <div className={s('mat-mdc-tab-label-container')}>
            <div className={s('mat-mdc-tab-list')}>
              <div className={s('mat-mdc-tab-labels')}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

Tabs.displayName = 'Tabs'

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  label?: React.ReactNode
  icon?: React.ReactNode
  value?: any
  selected?: boolean
  disabled?: boolean
}

export const Tab = forwardRef<HTMLButtonElement, TabProps>(
  ({ children, label, icon, value, selected, disabled, className = '', ...props }, ref) => {
    const hasIcon = Boolean(icon)
    const tabClasses = [
      s('mdc-tab'),
      s('mat-mdc-tab'),
      hasIcon && styles.tabWithIcon,
      selected && s('mdc-tab--active'),
      disabled && s('mat-mdc-tab-disabled'),
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        ref={ref}
        className={tabClasses}
        role="tab"
        aria-selected={selected}
        aria-disabled={disabled}
        disabled={disabled}
        {...props}
      >
        <span className={`${s('mdc-tab__ripple')} ${s('mat-mdc-tab-ripple')}`} />
        <span className={s('mdc-tab__content')}>
          {icon && <span className={styles.tabIcon}>{icon}</span>}
          <span className={s('mdc-tab__text-label')}>{label || children}</span>
        </span>
        <span className={s('mdc-tab-indicator')}>
          <span className={`${s('mdc-tab-indicator__content')} ${s('mdc-tab-indicator__content--underline')} ${selected ? s('mdc-tab-indicator--active') : ''}`} />
        </span>
      </button>
    )
  }
)

Tab.displayName = 'Tab'

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  value?: any
  index?: number
  hidden?: boolean
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ children, value, index, hidden, className = '', ...props }, ref) => {
    const isHidden = hidden ?? (value !== undefined && index !== undefined && value !== index)

    if (isHidden) {
      return null
    }

    return (
      <div
        ref={ref}
        className={`${s('mat-mdc-tab-body')} ${styles.tabPanel} ${className}`.trim()}
        role="tabpanel"
        {...props}
      >
        {children}
      </div>
    )
  }
)

TabPanel.displayName = 'TabPanel'
