import React from 'react'
import classNames from 'classnames'
import styles from '../../../scss/Backdrop.module.scss'

export interface BackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  open?: boolean
  invisible?: boolean
  centered?: boolean
  top?: boolean
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void
}

export const Backdrop: React.FC<BackdropProps> = ({
  children,
  open,
  invisible,
  centered,
  top,
  onClick,
  className,
  ...props
}) =>
  open ? (
    <div
      className={classNames(
        styles.backdrop,
        {
          [styles.invisible]: invisible,
          [styles.centered]: centered,
          [styles.top]: top,
        },
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children && <div className={styles.backdropContent}>{children}</div>}
    </div>
  ) : null
