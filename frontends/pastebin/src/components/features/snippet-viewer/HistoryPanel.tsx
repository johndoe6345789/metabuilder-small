'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from '@metabuilder/components/fakemui'
import { MaterialIcon } from '@metabuilder/components/fakemui'
import { useAppDispatch } from '@/store/hooks'
import { patchSnippetLocal } from '@/store/slices/snippetsSlice'
import { fetchRevisions, revertToRevision } from '@/lib/revisionApi'
import type { SnippetRevision } from '@/lib/types'
import styles from './history-panel.module.scss'

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

interface HistoryPanelProps {
  open: boolean
  onClose: () => void
  snippetId: string
}

export function HistoryPanel({ open, onClose, snippetId }: HistoryPanelProps) {
  const dispatch = useAppDispatch()
  const [revisions, setRevisions] = useState<SnippetRevision[]>([])
  const [loading, setLoading] = useState(false)
  const [revertingId, setRevertingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchRevisions(snippetId).then(revs => {
      setRevisions(revs)
      setLoading(false)
    })
  }, [open, snippetId])

  function handleRevert(rev: SnippetRevision) {
    setRevertingId(rev.id)
    startTransition(async () => {
      const updated = await revertToRevision(snippetId, rev.id)
      setRevertingId(null)
      if (!updated) {
        toast.error('Failed to revert — please try again')
        return
      }
      dispatch(patchSnippetLocal({
        id: snippetId,
        fields: { code: updated.code, files: updated.files },
      }))
      toast.success('Reverted successfully')
      // Re-fetch revisions to show the new revert entry
      fetchRevisions(snippetId).then(setRevisions)
    })
  }

  if (!open) return null

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside className={styles.panel} aria-label="Version history">
        <div className={styles.header}>
          <MaterialIcon name="history" size={20} className={styles.headerIcon} aria-hidden="true" />
          <span className={styles.headerTitle}>Version History</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close history">
            <MaterialIcon name="close" size={20} />
          </button>
        </div>

        <div className={styles.list}>
          {loading && (
            <p className={styles.empty}>Loading…</p>
          )}
          {!loading && revisions.length === 0 && (
            <p className={styles.empty}>No history yet — edits are saved automatically.</p>
          )}
          {!loading && revisions.map((rev, idx) => (
            <div key={rev.id} className={styles.row}>
              <div className={styles.rowMeta}>
                <span className={styles.rowTime}>{relativeTime(rev.createdAt)}</span>
                {idx === 0 && <span className={styles.currentChip}>Current</span>}
              </div>
              <p className={styles.rowPreview}>
                {(rev.files?.[0]?.content ?? rev.code).slice(0, 80).replace(/\n/g, ' ') || '(empty)'}
              </p>
              {idx !== 0 && (
                <button
                  className={styles.revertBtn}
                  onClick={() => handleRevert(rev)}
                  disabled={isPending && revertingId === rev.id}
                  aria-label={`Revert to version from ${relativeTime(rev.createdAt)}`}
                >
                  <MaterialIcon name="restore" size={14} aria-hidden="true" />
                  {revertingId === rev.id ? 'Reverting…' : 'Revert'}
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
