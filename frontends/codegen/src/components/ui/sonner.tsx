'use client'

import { useEffect, useState, useCallback, useRef, ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X, Check, Info, Warning, Spinner } from '@metabuilder/fakemui/icons'

// --- Toast types and state ---

type ToastType = 'default' | 'success' | 'error' | 'info' | 'warning' | 'loading'

interface ToastData {
  id: string
  message: string
  description?: string
  type: ToastType
  duration?: number
  dismissible?: boolean
}

type Listener = () => void

let nextId = 0
let toasts: ToastData[] = []
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

function addToast(message: string, type: ToastType = 'default', opts?: { description?: string; duration?: number; dismissible?: boolean }): string {
  const id = String(++nextId)
  toasts = [...toasts, { id, message, type, description: opts?.description, duration: opts?.duration, dismissible: opts?.dismissible ?? true }]
  emit()
  return id
}

function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

// --- Public toast API (sonner-compatible) ---

function toast(message: string, opts?: { description?: string; duration?: number }) {
  return addToast(message, 'default', opts)
}
toast.success = (message: string, opts?: { description?: string; duration?: number }) =>
  addToast(message, 'success', opts)
toast.error = (message: string, opts?: { description?: string; duration?: number }) =>
  addToast(message, 'error', opts)
toast.info = (message: string, opts?: { description?: string; duration?: number }) =>
  addToast(message, 'info', opts)
toast.warning = (message: string, opts?: { description?: string; duration?: number }) =>
  addToast(message, 'warning', opts)
toast.loading = (message: string, opts?: { description?: string; duration?: number }) =>
  addToast(message, 'loading', { ...opts, duration: opts?.duration ?? Infinity })
toast.dismiss = (id: string) => dismissToast(id)
toast.promise = <T,>(
  promise: Promise<T>,
  opts: { loading: string; success: string; error: string }
): Promise<T> => {
  const id = addToast(opts.loading, 'loading', { duration: Infinity })
  promise
    .then(() => {
      dismissToast(id)
      addToast(opts.success, 'success')
    })
    .catch(() => {
      dismissToast(id)
      addToast(opts.error, 'error')
    })
  return promise
}

// --- Subscribe hook ---

function useToastStore() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((t) => t + 1)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  return toasts
}

// --- Icon per type ---

const typeIcon: Record<ToastType, React.ReactNode> = {
  default: null,
  success: <Check className="h-4 w-4 text-green-500" />,
  error: <X className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <Warning className="h-4 w-4 text-yellow-500" />,
  loading: <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />,
}

const typeBorder: Record<ToastType, string> = {
  default: 'border-border',
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
  warning: 'border-yellow-500/30',
  loading: 'border-border',
}

// --- Individual toast ---

function ToastItem({ data, onDismiss }: { data: ToastData; onDismiss: (id: string) => void }) {
  const duration = data.duration ?? (data.type === 'error' ? 6000 : 4000)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (duration === Infinity) return
    const t = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(data.id), 200)
    }, duration)
    return () => clearTimeout(t)
  }, [duration, data.id, onDismiss])

  return (
    <div
      data-slot="toast"
      className={cn(
        'pointer-events-auto flex w-full items-center gap-3 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg transition-all duration-200',
        typeBorder[data.type],
        exiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      )}
    >
      {typeIcon[data.type] && <span className="shrink-0">{typeIcon[data.type]}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{data.message}</p>
        {data.description && <p className="text-xs text-muted-foreground mt-1">{data.description}</p>}
      </div>
      {data.dismissible !== false && (
        <button
          onClick={() => { setExiting(true); setTimeout(() => onDismiss(data.id), 200) }}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// --- Toaster container ---

interface ToasterProps extends ComponentProps<'div'> {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  theme?: string
}

function Toaster({ position = 'bottom-right', className, ...props }: ToasterProps) {
  const items = useToastStore()
  const [mounted, setMounted] = useState(false)
  const handleDismiss = useCallback((id: string) => dismissToast(id), [])

  useEffect(() => { setMounted(true) }, [])
  if (!mounted || items.length === 0) return null

  const positionClasses: Record<string, string> = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  }

  return createPortal(
    <div
      data-slot="toaster"
      className={cn(
        'fixed z-[100] flex flex-col gap-2 w-[356px] max-h-screen pointer-events-none',
        positionClasses[position],
        className
      )}
      {...props}
    >
      {items.map((t) => (
        <ToastItem key={t.id} data={t} onDismiss={handleDismiss} />
      ))}
    </div>,
    document.body
  )
}

export { Toaster, toast }
export type { ToasterProps }
