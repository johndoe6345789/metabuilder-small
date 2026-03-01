import { useState } from 'react'
import { Button, Menu, MenuItem, Divider } from '@metabuilder/components/fakemui'
import { Copy, Pencil, Trash, Eye, DotsThree, FolderOpen } from '@phosphor-icons/react'
import { Namespace } from '@/lib/types'
import { useTranslation } from '@/hooks/useTranslation'
import styles from './snippet-card-actions.module.scss'

interface SnippetCardActionsProps {
  isCopied: boolean
  isMoving: boolean
  availableNamespaces: Namespace[]
  onView: (e: React.MouseEvent) => void
  onCopy: (e: React.MouseEvent) => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onMoveToNamespace: (namespaceId: string) => void
}

export function SnippetCardActions({
  isCopied,
  isMoving,
  availableNamespaces,
  onView,
  onCopy,
  onEdit,
  onDelete,
  onMoveToNamespace,
}: SnippetCardActionsProps) {
  const t = useTranslation()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  return (
    <div className="flex items-center justify-between gap-2 pt-2" data-testid="snippet-card-actions" role="group" aria-label="Snippet actions">
      <div className="flex-1 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onView}
          className="gap-2"
          data-testid="snippet-card-view-btn"
          aria-label="View snippet"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t.snippetCard.viewButton}</span>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="gap-2"
          data-testid="snippet-card-copy-btn"
          aria-label={t.snippetCard.ariaLabels.copy}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{isCopied ? t.snippetCard.copiedButton : t.snippetCard.copyButton}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="min-h-[44px] min-w-[44px]"
          data-testid="snippet-card-edit-btn"
          aria-label={t.snippetCard.ariaLabels.edit}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget) }}
          className="min-h-[44px] min-w-[44px]"
          data-testid="snippet-card-actions-menu"
          aria-label="More options"
          aria-haspopup="menu"
        >
          <DotsThree className="h-4 w-4" weight="bold" aria-hidden="true" />
        </Button>

        <Menu
          open={Boolean(menuAnchor)}
          anchorEl={menuAnchor}
          onClose={() => setMenuAnchor(null)}
          data-testid="snippet-actions-menu-content"
          onClick={(e) => e.stopPropagation()}
        >
          {availableNamespaces.length > 0 && (
            <MenuItem
              disabled
              className={styles.menuLabel}
              aria-hidden="true"
            >
              <FolderOpen className="h-4 w-4 mr-2" aria-hidden="true" />
              Move to:
            </MenuItem>
          )}
          {availableNamespaces.length === 0 && (
            <MenuItem
              disabled
              data-testid="snippet-card-move-submenu"
              aria-label="Move snippet to another namespace"
            >
              <FolderOpen className="h-4 w-4 mr-2" aria-hidden="true" />
              No other namespaces
            </MenuItem>
          )}
          {availableNamespaces.map((namespace) => (
            <MenuItem
              key={namespace.id}
              onClick={() => { onMoveToNamespace(namespace.id); setMenuAnchor(null) }}
              data-testid={`move-to-namespace-${namespace.id}`}
              aria-label={`Move to ${namespace.name}${namespace.isDefault ? ' (Default)' : ''}`}
              disabled={isMoving}
            >
              {namespace.name}
              {namespace.isDefault && (
                <span className={`ml-2 text-xs ${styles.defaultBadge}`}>(Default)</span>
              )}
            </MenuItem>
          ))}
          {availableNamespaces.length > 0 && <Divider />}
          <MenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(e); setMenuAnchor(null) }}
            className={styles.deleteItem}
            data-testid="snippet-card-delete-btn"
            aria-label="Delete snippet"
          >
            <Trash className="h-4 w-4 mr-2" aria-hidden="true" />
            Delete
          </MenuItem>
        </Menu>
      </div>
    </div>
  )
}
