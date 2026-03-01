'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, Pencil, SplitVertical } from '@phosphor-icons/react'
import { Button, Chip } from '@metabuilder/components/fakemui'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/app/PageLayout'
import { useAppSelector } from '@/store/hooks'
import { selectSnippets } from '@/store/selectors'
import { LANGUAGE_COLORS, appConfig } from '@/lib/config'
import { useTranslation } from '@/hooks/useTranslation'
import { toast } from 'sonner'
import styles from './snippet-view-page.module.scss'

const SnippetViewerContent = dynamic(
  () => import('@/components/features/snippet-viewer/SnippetViewerContent').then(mod => ({ default: mod.SnippetViewerContent })),
  { ssr: false }
)

export default function SnippetViewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslation()
  const snippets = useAppSelector(selectSnippets)
  const snippet = snippets.find(s => s.id === id) ?? null

  const [isCopied, setIsCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  useEffect(() => {
    if (snippets.length > 0 && !snippet) {
      router.replace('/')
    }
  }, [snippet, snippets.length, router])

  if (!snippet) {
    return (
      <PageLayout>
        <div className="text-center py-20 text-muted-foreground">Loading…</div>
      </PageLayout>
    )
  }

  const canPreview = !!(snippet.hasPreview && appConfig.previewEnabledLanguages.includes(snippet.language))
  const isPython = snippet.language === 'Python'

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet.code)
    toast.success(t.toast.codeCopied)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), appConfig.copiedTimeout)
  }

  return (
    <PageLayout>
      <div className={styles.page} data-testid="snippet-view-page">
        <div className={styles.topBar}>
          <button
            className={styles.backBtn}
            onClick={() => router.push('/')}
            aria-label="Back to snippets"
          >
            <ArrowLeft size={18} weight="bold" />
            <span>Back</span>
          </button>

          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>{snippet.title}</h1>
            <Chip
              label={snippet.language}
              variant="outlined"
              size="small"
              className={`shrink-0 font-medium text-xs ${LANGUAGE_COLORS[snippet.language] || LANGUAGE_COLORS['Other']}`}
            />
          </div>

          <div className={styles.topBarActions}>
            {canPreview && (
              <Button
                variant={showPreview ? 'filled' : 'outlined'}
                size="sm"
                onClick={() => setShowPreview(p => !p)}
                aria-pressed={showPreview}
              >
                <SplitVertical size={16} />
                {showPreview ? t.snippetViewer.buttons.hidePreview : t.snippetViewer.buttons.showPreview}
              </Button>
            )}
            <Button variant="outlined" size="sm" onClick={handleCopy} aria-live="polite">
              {isCopied ? <><Check size={16} weight="bold" />{t.snippetViewer.buttons.copied}</> : <><Copy size={16} />{t.snippetViewer.buttons.copy}</>}
            </Button>
            <Button variant="filled" size="sm" onClick={() => router.push(`/snippet/${id}/edit`)}>
              <Pencil size={16} />
              {t.snippetViewer.buttons.edit}
            </Button>
          </div>
        </div>

        {snippet.description && (
          <p className={styles.description}>{snippet.description}</p>
        )}

        <div className={styles.codeArea}>
          <SnippetViewerContent
            snippet={snippet}
            canPreview={canPreview}
            showPreview={showPreview}
            isPython={isPython}
          />
        </div>
      </div>
    </PageLayout>
  )
}
