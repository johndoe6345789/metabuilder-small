import { Button, IconButton, Dialog, DialogHeader, DialogTitle, DialogContent, DialogActions } from '@metabuilder/components/fakemui'
import { Trash } from '@phosphor-icons/react'
import { Namespace } from '@/lib/types'

interface DeleteNamespaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  namespace: Namespace | null
  onDeleteNamespace: () => void
  loading: boolean
  showTrigger?: boolean
  onOpenDialog?: () => void
}

export function DeleteNamespaceDialog({
  open,
  onOpenChange,
  namespace,
  onDeleteNamespace,
  loading,
  showTrigger = false,
  onOpenDialog,
}: DeleteNamespaceDialogProps) {
  return (
    <>
      {showTrigger && (
        <IconButton
          onClick={onOpenDialog}
          data-testid="delete-namespace-trigger"
          aria-label="Delete namespace"
        >
          <Trash weight="bold" aria-hidden="true" />
        </IconButton>
      )}

      <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
        <DialogHeader>
          <DialogTitle>Delete Namespace</DialogTitle>
        </DialogHeader>
        <DialogContent data-testid="delete-namespace-dialog">
          <p>
            Are you sure you want to delete "{namespace?.name}"? All snippets in this namespace will be moved to the default namespace.
          </p>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => onOpenChange(false)}
            data-testid="delete-namespace-cancel-btn"
          >
            Cancel
          </Button>
          <Button
            onClick={onDeleteNamespace}
            disabled={loading}
            data-testid="delete-namespace-confirm-btn"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
