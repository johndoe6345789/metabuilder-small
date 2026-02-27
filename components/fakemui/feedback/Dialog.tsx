/**
 * Dialog Component
 * Material Design 3 dialog with backdrop and content panel
 * Wraps DialogOverlay and DialogPanel for consistent styling with Angular Material
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DialogOverlay, DialogPanel } from '../utils/Dialog';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  fullScreen?: boolean;
  disableEscapeKeyDown?: boolean;
  disableBackdropClick?: boolean;
}

export function Dialog({
  open,
  onClose,
  children,
  maxWidth = 'sm',
  fullWidth = false,
  fullScreen = false,
  disableEscapeKeyDown = false,
  disableBackdropClick = false,
}: DialogProps): React.ReactElement | null {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableEscapeKeyDown) {
        onClose();
      }
    },
    [onClose, disableEscapeKeyDown]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const handleBackdropClick = () => {
    if (!disableBackdropClick) {
      onClose();
    }
  };

  // Map maxWidth to DialogPanel size props
  const sizeProps = {
    sm: maxWidth === 'xs' || maxWidth === 'sm',
    lg: maxWidth === 'md' || maxWidth === 'lg',
    xl: maxWidth === 'xl',
  };

  const dialog = (
    <DialogOverlay onClick={handleBackdropClick}>
      <DialogPanel
        open={open}
        fullScreen={fullScreen}
        fullWidth={fullWidth}
        sm={sizeProps.sm}
        lg={sizeProps.lg}
        xl={sizeProps.xl}
        hasActions={true}
      >
        {children}
      </DialogPanel>
    </DialogOverlay>
  );

  // Use portal to render at document root
  if (typeof document !== 'undefined') {
    return createPortal(dialog, document.body);
  }

  return dialog;
}

export default Dialog;
