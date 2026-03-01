"use client"

import { Button, IconButton, Dialog, DialogHeader, DialogTitle, DialogContent, DialogActions, DialogClose, Input } from '@metabuilder/components/fakemui'
import { Plus, X } from '@phosphor-icons/react'
import { useTranslation } from '@/hooks/useTranslation'
import styles from './namespace-dialog.module.scss'

interface CreateNamespaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  namespaceName: string
  onNamespaceNameChange: (name: string) => void
  onCreateNamespace: () => void
  loading: boolean
}

export function CreateNamespaceDialog({
  open,
  onOpenChange,
  namespaceName,
  onNamespaceNameChange,
  onCreateNamespace,
  loading,
}: CreateNamespaceDialogProps) {
  const t = useTranslation()
  return (
    <>
      <IconButton
        onClick={() => onOpenChange(true)}
        data-testid="create-namespace-trigger"
        aria-label={t.namespace.create.ariaLabel}
      >
        <Plus weight="bold" aria-hidden="true" />
      </IconButton>

      <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
        <DialogClose onClick={() => onOpenChange(false)} aria-label={t.common.close}>
          <X size={20} />
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{t.namespace.create.title}</DialogTitle>
        </DialogHeader>
        <DialogContent data-testid="create-namespace-dialog">
          <p className={styles.description}>{t.namespace.create.description}</p>
          <div className="space-y-4">
            <Input
              placeholder={t.namespace.create.namePlaceholder}
              value={namespaceName}
              onChange={(e) => onNamespaceNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreateNamespace()}
              data-testid="namespace-name-input"
              aria-label={t.namespace.create.namePlaceholder}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => onOpenChange(false)}
            data-testid="create-namespace-cancel-btn"
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="filled"
            onClick={onCreateNamespace}
            disabled={loading}
            data-testid="create-namespace-save-btn"
          >
            {t.common.create}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
