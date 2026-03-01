import { Button, IconButton, Dialog, DialogHeader, DialogTitle, DialogContent, DialogActions, DialogClose } from '@metabuilder/components/fakemui'
import { Trash, X } from '@phosphor-icons/react'
import { Namespace } from '@/lib/types'
import { useTranslation } from '@/hooks/useTranslation'

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
  const t = useTranslation()
  return (
    <>
      {showTrigger && (
        <IconButton
          onClick={onOpenDialog}
          data-testid="delete-namespace-trigger"
          aria-label={t.namespace.delete.ariaLabel}
        >
          <Trash weight="bold" aria-hidden="true" />
        </IconButton>
      )}

      <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
        <DialogClose onClick={() => onOpenChange(false)} aria-label={t.common.close}>
          <X size={20} />
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{t.namespace.delete.title}</DialogTitle>
        </DialogHeader>
        <DialogContent data-testid="delete-namespace-dialog">
          <p>
            {t.namespace.delete.body.replace('{name}', namespace?.name ?? '')}
          </p>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => onOpenChange(false)}
            data-testid="delete-namespace-cancel-btn"
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="filled"
            onClick={onDeleteNamespace}
            disabled={loading}
            data-testid="delete-namespace-confirm-btn"
          >
            {t.common.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
