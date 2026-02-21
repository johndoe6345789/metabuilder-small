import React, { forwardRef } from 'react'
import classNames from 'classnames'
import styles from '../../../scss/atoms/form.module.scss'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = '', ...props }, ref) => (
    <textarea
      ref={ref}
      className={classNames(styles.textarea, error && styles.textareaError, className)}
      {...props}
    />
  )
)

Textarea.displayName = 'Textarea'
