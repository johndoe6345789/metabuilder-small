'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ComponentProps,
  ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

// --- Context ---

type DrawerDirection = 'top' | 'bottom' | 'left' | 'right'

interface DrawerContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  direction: DrawerDirection
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

function useDrawer() {
  const ctx = useContext(DrawerContext)
  if (!ctx) throw new Error('Drawer compound components must be used within <Drawer>')
  return ctx
}

// --- Root ---

interface DrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  direction?: DrawerDirection
  children: ReactNode
}

function Drawer({ open: controlledOpen, onOpenChange, direction = 'right', children }: DrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen ?? internalOpen
  const handleChange = useCallback(
    (v: boolean) => {
      onOpenChange?.(v)
      if (controlledOpen === undefined) setInternalOpen(v)
    },
    [controlledOpen, onOpenChange]
  )

  return (
    <DrawerContext.Provider value={{ open: isOpen, onOpenChange: handleChange, direction }}>
      {children}
    </DrawerContext.Provider>
  )
}

// --- Trigger ---

function DrawerTrigger({ children, ...props }: ComponentProps<'button'>) {
  const { onOpenChange } = useDrawer()
  return (
    <button data-slot="drawer-trigger" onClick={() => onOpenChange(true)} {...props}>
      {children}
    </button>
  )
}

// --- Portal ---

function DrawerPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(<>{children}</>, document.body)
}

// --- Close ---

function DrawerClose({ children, ...props }: ComponentProps<'button'>) {
  const { onOpenChange } = useDrawer()
  return (
    <button data-slot="drawer-close" onClick={() => onOpenChange(false)} {...props}>
      {children}
    </button>
  )
}

// --- Overlay ---

function DrawerOverlay({ className, ...props }: ComponentProps<'div'>) {
  const { onOpenChange } = useDrawer()
  return (
    <div
      data-slot="drawer-overlay"
      className={cn('fixed inset-0 z-50 bg-black/50 animate-in fade-in-0', className)}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  )
}

// --- Content ---

const directionClasses: Record<DrawerDirection, string> = {
  top: 'inset-x-0 top-0 max-h-[80vh] rounded-b-lg border-b animate-in slide-in-from-top',
  bottom: 'inset-x-0 bottom-0 max-h-[80vh] rounded-t-lg border-t animate-in slide-in-from-bottom',
  left: 'inset-y-0 left-0 w-3/4 sm:max-w-sm border-r animate-in slide-in-from-left',
  right: 'inset-y-0 right-0 w-3/4 sm:max-w-sm border-l animate-in slide-in-from-right',
}

function DrawerContent({ className, children, ...props }: ComponentProps<'div'>) {
  const { open, onOpenChange, direction } = useDrawer()

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <div
        data-slot="drawer-content"
        className={cn(
          'group/drawer-content bg-background fixed z-50 flex h-auto flex-col',
          directionClasses[direction],
          className
        )}
        {...props}
      >
        {direction === 'bottom' && (
          <div className="bg-muted mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full" />
        )}
        {children}
      </div>
    </DrawerPortal>
  )
}

// --- Header / Footer / Title / Description ---

function DrawerHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="drawer-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />
}

function DrawerFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="drawer-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
}

function DrawerTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 data-slot="drawer-title" className={cn('text-foreground font-semibold', className)} {...props} />
}

function DrawerDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="drawer-description" className={cn('text-muted-foreground text-sm', className)} {...props} />
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
