"use client"

import { Button, Chip, MaterialIcon } from '@metabuilder/components/fakemui'
import { Snippet } from '@/lib/types'
import { LANGUAGE_COLORS } from '@/lib/config'
import { useTranslation } from '@/hooks/useTranslation'
import styles from './snippet-viewer-header.module.scss'

interface SnippetViewerHeaderProps {
  snippet: Snippet
  isCopied: boolean
  canPreview: boolean
  showPreview: boolean
  onCopy: () => void
  onEdit: () => void
  onTogglePreview: () => void
}

export function SnippetViewerHeader({
  snippet,
  isCopied,
  canPreview,
  showPreview,
  onCopy,
  onEdit,
  onTogglePreview,
}: SnippetViewerHeaderProps) {
  const t = useTranslation()
  return (
    <div className={styles.root}>
      <div className={styles.titleSection}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>
            {snippet.title}
          </h2>
          <Chip
            label={snippet.language}
            variant="outlined"
            size="small"
            className={`${styles.languageChip} ${LANGUAGE_COLORS[snippet.language] || LANGUAGE_COLORS['Other']}`}
          />
        </div>
        {snippet.description && (
          <p className={styles.description}>
            {snippet.description}
          </p>
        )}
        <p className={styles.timestamp}>
          {t.snippetViewer.lastUpdated}: {new Date(snippet.updatedAt).toLocaleString()}
        </p>
      </div>
      <div className={styles.actions} data-testid="viewer-header-actions" role="toolbar" aria-label="Snippet viewer actions">
        {canPreview && (
          <Button
            variant={showPreview ? "filled" : "outline"}
            size="sm"
            onClick={onTogglePreview}
            className={styles.actionBtn}
            data-testid="snippet-viewer-toggle-preview-btn"
            aria-pressed={showPreview}
            aria-label={showPreview ? "Hide preview" : "Show preview"}
          >
            <MaterialIcon name="vertical_split" className={styles.actionIcon} aria-hidden="true" />
            {showPreview ? t.snippetViewer.buttons.hidePreview : t.snippetViewer.buttons.showPreview}
          </Button>
        )}
        <Button
          variant="outlined"
          size="sm"
          onClick={onCopy}
          className={styles.actionBtn}
          data-testid="snippet-viewer-copy-btn"
          aria-label={isCopied ? "Code copied to clipboard" : "Copy code to clipboard"}
          aria-live="polite"
        >
          {isCopied ? (
            <>
              <MaterialIcon name="check" className={styles.actionIcon} aria-hidden="true" />
              {t.snippetViewer.buttons.copied}
            </>
          ) : (
            <>
              <MaterialIcon name="content_copy" className={styles.actionIcon} aria-hidden="true" />
              {t.snippetViewer.buttons.copy}
            </>
          )}
        </Button>
        <Button
          variant="outlined"
          size="sm"
          onClick={onEdit}
          className={styles.actionBtn}
          data-testid="snippet-viewer-edit-btn"
          aria-label="Edit snippet"
        >
          <MaterialIcon name="edit" className={styles.actionIcon} aria-hidden="true" />
          {t.snippetViewer.buttons.edit}
        </Button>
      </div>
    </div>
  )
}
