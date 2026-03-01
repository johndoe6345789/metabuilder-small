'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, Pencil, SplitVertical, X } from '@phosphor-icons/react'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/app/PageLayout'
import { useAppSelector } from '@/store/hooks'
import { selectSnippets, selectNamespaces } from '@/store/selectors'
import { LANGUAGE_COLORS, appConfig } from '@/lib/config'
import { useTranslation } from '@/hooks/useTranslation'
import { toast } from 'sonner'
import styles from './snippet-view-page.module.scss'

const SnippetViewerContent = dynamic(
  () => import('@/components/features/snippet-viewer/SnippetViewerContent').then(mod => ({ default: mod.SnippetViewerContent })),
  { ssr: false }
)

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  JavaScript: 'js', TypeScript: 'ts', JSX: 'jsx', TSX: 'tsx',
  Python: 'py', Java: 'java', 'C++': 'cpp', 'C#': 'cs',
  Go: 'go', Rust: 'rs', Ruby: 'rb', PHP: 'php',
  Swift: 'swift', Kotlin: 'kt', Scala: 'scala', Haskell: 'hs',
  R: 'r', Julia: 'jl', Elixir: 'ex', Dart: 'dart',
  Lua: 'lua', Perl: 'pl', HTML: 'html', CSS: 'css',
  SQL: 'sql', Bash: 'sh',
}

function getFilename(title: string, language: string): string {
  const ext = LANGUAGE_EXTENSIONS[language] ?? 'txt'
  const base = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').slice(0, 30) || 'snippet'
  return `${base}.${ext}`
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function SnippetViewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslation()
  const snippets = useAppSelector(selectSnippets)
  const namespaces = useAppSelector(selectNamespaces)
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
  const filename = getFilename(snippet.title, snippet.language)
  const lineCount = snippet.code.split('\n').length
  const namespace = namespaces.find(n => n.id === snippet.namespaceId)
  const langBgClass = (LANGUAGE_COLORS[snippet.language] || LANGUAGE_COLORS['Other']).split(' ')[0]

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet.code)
    toast.success(t.toast.codeCopied)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), appConfig.copiedTimeout)
  }

  return (
    <PageLayout>
      <div className={styles.page} data-testid="snippet-view-page">

        {/* App top bar — navigation only */}
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => router.push('/')} aria-label="Back to snippets">
            <ArrowLeft size={16} weight="bold" />
            <span>Back</span>
          </button>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>{snippet.title}</h1>
            {snippet.description && (
              <span className={styles.titleDescription} title={snippet.description}>
                {snippet.description}
              </span>
            )}
          </div>
        </div>

        {/* VSCode-like editor chrome */}
        <div className={styles.editorChrome}>

          {/* Tab bar */}
          <div className={styles.tabBar} role="tablist">
            <div className={styles.tab} role="tab" aria-selected="true">
              <span className={`${styles.langDot} ${langBgClass}`} aria-hidden="true" />
              <span className={styles.tabName}>{filename}</span>
              <button className={styles.tabClose} onClick={() => router.push('/')} aria-label="Close, back to snippets">
                <X size={11} weight="bold" />
              </button>
            </div>
            <div className={styles.tabRail} aria-hidden="true" />
          </div>

          {/* Editor toolbar — breadcrumb left, actions right */}
          <div className={styles.editorToolbar}>
            <div className={styles.breadcrumb} aria-label="File path">
              <span className={styles.breadcrumbItem}>Snippets</span>
              {namespace && (
                <>
                  <span className={styles.breadcrumbSep} aria-hidden="true">›</span>
                  <span className={styles.breadcrumbItem}>{namespace.name}</span>
                </>
              )}
              <span className={styles.breadcrumbSep} aria-hidden="true">›</span>
              <span className={`${styles.breadcrumbItem} ${styles.breadcrumbActive}`}>{filename}</span>
            </div>

            <div className={styles.toolbarActions} role="toolbar" aria-label="Editor actions">
              {canPreview && (
                <button
                  className={`${styles.toolbarBtn} ${showPreview ? styles.toolbarBtnOn : ''}`}
                  onClick={() => setShowPreview(p => !p)}
                  title={showPreview ? 'Hide preview' : 'Show preview'}
                  aria-pressed={showPreview}
                >
                  <SplitVertical size={13} />
                  <span>Preview</span>
                </button>
              )}
              <div className={styles.toolbarDivider} aria-hidden="true" />
              <button
                className={`${styles.toolbarBtn} ${isCopied ? styles.toolbarBtnOn : ''}`}
                onClick={handleCopy}
                title="Copy code to clipboard"
                aria-live="polite"
              >
                {isCopied
                  ? <><Check size={13} weight="bold" /><span>Copied!</span></>
                  : <><Copy size={13} /><span>Copy</span></>}
              </button>
              <button
                className={`${styles.toolbarBtn} ${styles.toolbarBtnEdit}`}
                onClick={() => router.push(`/snippet/${id}/edit`)}
                title="Edit this snippet"
              >
                <Pencil size={13} />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* Monaco code area */}
          <div className={styles.codeArea}>
            <SnippetViewerContent
              snippet={snippet}
              canPreview={canPreview}
              showPreview={showPreview}
              isPython={isPython}
            />
          </div>

          {/* Status bar */}
          <div className={styles.statusBar} role="status" aria-label="File information">
            <div className={styles.statusLeft}>
              <span className={styles.statusItem}>{snippet.language}</span>
              <span className={styles.statusSep} aria-hidden="true" />
              <span className={styles.statusItem}>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
            </div>
            <div className={styles.statusRight}>
              <span className={styles.statusItem}>Updated {relativeTime(snippet.updatedAt)}</span>
            </div>
          </div>

        </div>
      </div>
    </PageLayout>
  )
}
