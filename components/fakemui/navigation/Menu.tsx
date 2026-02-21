import React, { forwardRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import classNames from 'classnames'
import { Backdrop } from '../feedback/Backdrop'
import styles from '../../../scss/atoms/mat-menu.module.scss'

const s = (key: string): string => styles[key] || key

export interface MenuProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  open?: boolean
  anchorEl?: HTMLElement | null
  onClose?: () => void
  /** Menu appears from right side */
  anchorRight?: boolean
  /** Menu appears from bottom */
  anchorBottom?: boolean
  /** Dense variant with smaller items */
  dense?: boolean
}

export const Menu: React.FC<MenuProps> = ({
  children,
  open,
  anchorEl,
  onClose,
  anchorRight,
  anchorBottom,
  dense,
  className,
  style,
  ...props
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  const rect = anchorEl?.getBoundingClientRect()
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: rect ? rect.bottom + 4 : 0,
    zIndex: 'var(--z-menu, 1300)',
    ...(anchorRight ? { right: rect ? window.innerWidth - rect.right : 0 } : { left: rect?.left ?? 0 }),
    ...style,
  }

  return createPortal(
    <>
      <Backdrop open invisible onClick={onClose} />
      <div
        className={classNames(
          s('mat-mdc-menu-panel'),
          styles.matMenu,
          {
            [styles.menuRight]: anchorRight,
            [styles.menuBottom]: anchorBottom,
            [styles.menuDense]: dense,
          },
          className
        )}
        role="menu"
        style={menuStyle}
        {...props}
      >
        <div className={s('mat-mdc-menu-content')}>
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}

export interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  selected?: boolean
  disabled?: boolean
  /** Value for Select component integration */
  value?: string | number
  /** Leading icon element */
  icon?: React.ReactNode
  /** Keyboard shortcut text */
  shortcut?: string
  /** Trailing element */
  trailing?: React.ReactNode
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ children, selected, disabled, value, icon, shortcut, trailing, className, ...props }, ref) => (
    <button
      ref={ref}
      className={classNames(
        s('mat-mdc-menu-item'),
        {
          [s('mat-mdc-menu-item-highlighted')]: selected,
        },
        className
      )}
      role="menuitem"
      disabled={disabled}
      aria-disabled={disabled}
      data-value={value}
      {...props}
    >
      {icon && <span className={classNames(s('mat-icon'), styles.menuItemIcon)}>{icon}</span>}
      <span className={classNames(s('mat-mdc-menu-item-text'), styles.menuItemText)}>{children}</span>
      {shortcut && <span className={styles.menuItemShortcut}>{shortcut}</span>}
      {trailing && <span className={styles.menuItemTrailing}>{trailing}</span>}
    </button>
  )
)

MenuItem.displayName = 'MenuItem'

export interface MenuListProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export const MenuList: React.FC<MenuListProps> = ({ children, className, ...props }) => (
  <div className={classNames(s('mat-mdc-menu-content'), className)} role="menu" {...props}>
    {children}
  </div>
)

export interface MenuDividerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const MenuDivider: React.FC<MenuDividerProps> = ({ className, ...props }) => (
  <div className={classNames(s('mat-divider'), styles.menuDivider, className)} role="separator" {...props} />
)

export interface MenuSubheaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export const MenuSubheader: React.FC<MenuSubheaderProps> = ({ children, className, ...props }) => (
  <div className={classNames(styles.menuSubheader, className)} {...props}>
    {children}
  </div>
)
