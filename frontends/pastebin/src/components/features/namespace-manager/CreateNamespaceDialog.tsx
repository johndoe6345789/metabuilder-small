"use client"

import { Button, Dialog, DialogHeader, DialogTitle, DialogContent, DialogActions, DialogClose, Input } from '@metabuilder/components/fakemui'
import { Plus, X } from '@phosphor-icons/react'

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
  return (
    <>
      <Button
        variant="outlined"
        size="sm"
        onClick={() => onOpenChange(true)}
        className="px-2 py-1"
        data-testid="create-namespace-trigger"
        aria-label="Create new namespace"
      >
        <Plus weight="bold" aria-hidden="true" />
      </Button>

      <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
        <DialogClose onClick={() => onOpenChange(false)} aria-label="Close dialog">
          <X size={20} />
        </DialogClose>
        <DialogHeader>
          <DialogTitle>Create Namespace</DialogTitle>
        </DialogHeader>
        <DialogContent data-testid="create-namespace-dialog">
          <p style={{ color: 'var(--mat-sys-on-surface-variant)', marginBottom: '16px' }}>
            Create a new namespace to organize your snippets
          </p>
          <div className="space-y-4">
            <Input
              placeholder="Namespace name"
              value={namespaceName}
              onChange={(e) => onNamespaceNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreateNamespace()}
              data-testid="namespace-name-input"
              aria-label="Namespace name"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => onOpenChange(false)}
            data-testid="create-namespace-cancel-btn"
          >
            Cancel
          </Button>
          <Button
            onClick={onCreateNamespace}
            disabled={loading}
            data-testid="create-namespace-save-btn"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
