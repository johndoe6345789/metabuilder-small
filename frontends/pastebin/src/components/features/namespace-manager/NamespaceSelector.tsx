import { useState, useEffect, useCallback } from 'react'
import { Folder, Plus, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Namespace } from '@/lib/types'
import {
  getAllNamespaces,
  createNamespace,
  deleteNamespace,
  getSnippetsByNamespace,
  bulkMoveSnippets,
} from '@/lib/db'
import { useTranslation } from '@/hooks/useTranslation'
import { CreateNamespaceDialog } from './CreateNamespaceDialog'
import { DeleteNamespaceDialog } from './DeleteNamespaceDialog'
import styles from './namespace-selector.module.scss'

interface NamespaceSelectorProps {
  selectedNamespaceId: string | null
  onNamespaceChange: (namespaceId: string) => void
}

export function NamespaceSelector({ selectedNamespaceId, onNamespaceChange }: NamespaceSelectorProps) {
  const t = useTranslation()
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
        if (defaultNamespace) onNamespaceChange(defaultNamespace.id)
      }
    } catch (error) {
      console.error('Failed to load namespaces:', error)
      toast.error(t.namespace.selector.failedToLoad)
    }
  }, [onNamespaceChange, selectedNamespaceId])

  useEffect(() => { loadNamespaces() }, [loadNamespaces])

  const handleCreateNamespace = async () => {
    if (!newNamespaceName.trim()) {
      toast.error(t.namespace.selector.enterName)
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
      toast.success(t.namespace.selector.created)
    } catch (error) {
      console.error('Failed to create namespace:', error)
      toast.error(t.namespace.selector.failedToCreate)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNamespace = async () => {
    if (!namespaceToDelete) return
    const defaultNamespace = namespaces.find(n => n.isDefault)
    if (!defaultNamespace) {
      toast.error(t.namespace.selector.noDefault)
      return
    }
    setLoading(true)
    try {
      const snippetsToMove = await getSnippetsByNamespace(namespaceToDelete.id)
      if (snippetsToMove.length > 0) {
        await bulkMoveSnippets(snippetsToMove.map(s => s.id), defaultNamespace.id)
      }
      await deleteNamespace(namespaceToDelete.id)
      setNamespaces(prev => prev.filter(n => n.id !== namespaceToDelete.id))
      if (selectedNamespaceId === namespaceToDelete.id) onNamespaceChange(defaultNamespace.id)
      setDeleteDialogOpen(false)
      setNamespaceToDelete(null)
      const movedCount = snippetsToMove.length
      toast.success(
        movedCount > 0
          ? t.namespace.selector.deletedWithMoved.replace('{count}', String(movedCount))
          : t.namespace.selector.deleted
      )
    } catch (error) {
      console.error('Failed to delete namespace:', error)
      toast.error(t.namespace.selector.failedToDelete)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.bar} data-testid="namespace-selector" role="group" aria-label="Namespace selector">
      {namespaces.map(namespace => {
        const isActive = namespace.id === selectedNamespaceId
        return (
          <button
            key={namespace.id}
            className={isActive ? styles.chipActive : styles.chip}
            onClick={() => onNamespaceChange(namespace.id)}
            data-testid={`namespace-chip-${namespace.id}`}
            aria-pressed={isActive}
            aria-label={`Switch to ${namespace.name} namespace`}
          >
            {isActive && <Folder weight="fill" size={14} aria-hidden="true" />}
            <span>{namespace.name}</span>
            {isActive && !namespace.isDefault && (
              <button
                className={styles.chipDeleteBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  setNamespaceToDelete(namespace)
                  setDeleteDialogOpen(true)
                }}
                data-testid="delete-namespace-trigger"
                aria-label={`Delete ${namespace.name} namespace`}
              >
                <X size={11} weight="bold" aria-hidden="true" />
              </button>
            )}
          </button>
        )
      })}

      <button
        className={styles.addBtn}
        onClick={() => setCreateDialogOpen(true)}
        data-testid="create-namespace-trigger"
        aria-label="Create new namespace"
      >
        <Plus size={16} weight="bold" aria-hidden="true" />
      </button>

      <CreateNamespaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        namespaceName={newNamespaceName}
        onNamespaceNameChange={setNewNamespaceName}
        onCreateNamespace={handleCreateNamespace}
        loading={loading}
      />

      <DeleteNamespaceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        namespace={namespaceToDelete}
        onDeleteNamespace={handleDeleteNamespace}
        loading={loading}
      />
    </div>
  )
}
