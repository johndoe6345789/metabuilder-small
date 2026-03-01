import { useState, useEffect, useCallback } from 'react'
import { Select, MenuItem } from '@metabuilder/components/fakemui'
import type { SelectChangeEvent } from '@metabuilder/components/fakemui'
import { Folder } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Namespace } from '@/lib/types'
import {
  getAllNamespaces,
  createNamespace,
  deleteNamespace,
  getSnippetsByNamespace,
  bulkMoveSnippets,
} from '@/lib/db'
import { CreateNamespaceDialog } from './CreateNamespaceDialog'
import { DeleteNamespaceDialog } from './DeleteNamespaceDialog'
import styles from './namespace-selector.module.scss'

interface NamespaceSelectorProps {
  selectedNamespaceId: string | null
  onNamespaceChange: (namespaceId: string) => void
}

export function NamespaceSelector({ selectedNamespaceId, onNamespaceChange }: NamespaceSelectorProps) {
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [newNamespaceName, setNewNamespaceName] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [namespaceToDelete, setNamespaceToDelete] = useState<Namespace | null>(null)
  const [loading, setLoading] = useState(false)

  const loadNamespaces = useCallback(async () => {
    try {
      const loadedNamespaces = await getAllNamespaces()
      setNamespaces(loadedNamespaces)

      if (!selectedNamespaceId && loadedNamespaces.length > 0) {
        const defaultNamespace = loadedNamespaces.find(n => n.isDefault)
        if (defaultNamespace) {
          onNamespaceChange(defaultNamespace.id)
        }
      }
    } catch (error) {
      console.error('Failed to load namespaces:', error)
      toast.error('Failed to load namespaces')
    }
  }, [onNamespaceChange, selectedNamespaceId])

  useEffect(() => {
    loadNamespaces()
  }, [loadNamespaces])

  const handleCreateNamespace = async () => {
    if (!newNamespaceName.trim()) {
      toast.error('Please enter a namespace name')
      return
    }

    setLoading(true)
    try {
      const newNamespace: Namespace = {
        id: Date.now().toString(),
        name: newNamespaceName.trim(),
        createdAt: Date.now(),
        isDefault: false,
      }
      await createNamespace(newNamespace)
      setNamespaces(prev => [...prev, newNamespace])
      setNewNamespaceName('')
      setCreateDialogOpen(false)
      toast.success('Namespace created')
    } catch (error) {
      console.error('Failed to create namespace:', error)
      toast.error('Failed to create namespace')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNamespace = async () => {
    if (!namespaceToDelete) return

    const defaultNamespace = namespaces.find(n => n.isDefault)
    if (!defaultNamespace) {
      toast.error('Cannot delete: no default namespace found')
      return
    }

    setLoading(true)
    try {
      // Move snippets to default before deleting the namespace
      const snippetsToMove = await getSnippetsByNamespace(namespaceToDelete.id)
      if (snippetsToMove.length > 0) {
        await bulkMoveSnippets(snippetsToMove.map(s => s.id), defaultNamespace.id)
      }

      await deleteNamespace(namespaceToDelete.id)
      setNamespaces(prev => prev.filter(n => n.id !== namespaceToDelete.id))

      if (selectedNamespaceId === namespaceToDelete.id) {
        onNamespaceChange(defaultNamespace.id)
      }

      setDeleteDialogOpen(false)
      setNamespaceToDelete(null)
      const movedCount = snippetsToMove.length
      toast.success(
        movedCount > 0
          ? `Namespace deleted — ${movedCount} snippet${movedCount !== 1 ? 's' : ''} moved to default`
          : 'Namespace deleted'
      )
    } catch (error) {
      console.error('Failed to delete namespace:', error)
      toast.error('Failed to delete namespace')
    } finally {
      setLoading(false)
    }
  }

  const selectedNamespace = namespaces.find(n => n.id === selectedNamespaceId)

  return (
    <div className={styles.row} data-testid="namespace-selector" role="group" aria-label="Namespace selector">
      <div className={styles.controls}>
        <span className={styles.folderIcon}>
          <Folder weight="fill" size={15} aria-hidden="true" />
        </span>

        <Select
          value={selectedNamespaceId || ''}
          onChange={(e: SelectChangeEvent) => onNamespaceChange(e.target.value as string)}
          data-testid="namespace-selector-trigger"
          aria-label="Select namespace"
          variant="standard"
          size="small"
          autoWidth
          className={styles.select}
        >
          {namespaces.map(namespace => (
            <MenuItem
              key={namespace.id}
              value={namespace.id}
              data-testid={`namespace-option-${namespace.id}`}
            >
              <div className={styles.namespaceItem}>
                <span>{namespace.name}</span>
                {namespace.isDefault && (
                  <span className={styles.defaultBadge}>(Default)</span>
                )}
              </div>
            </MenuItem>
          ))}
        </Select>

        <span className={styles.divider} aria-hidden="true" />

        <CreateNamespaceDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          namespaceName={newNamespaceName}
          onNamespaceNameChange={setNewNamespaceName}
          onCreateNamespace={handleCreateNamespace}
          loading={loading}
        />

        {selectedNamespace && !selectedNamespace.isDefault && (
          <DeleteNamespaceDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            namespace={namespaceToDelete}
            onDeleteNamespace={handleDeleteNamespace}
            loading={loading}
            showTrigger
            onOpenDialog={() => {
              setNamespaceToDelete(selectedNamespace)
              setDeleteDialogOpen(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
