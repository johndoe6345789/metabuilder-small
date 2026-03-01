'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, Pencil, SplitVertical, TextAlignLeft, File, Folder } from '@phosphor-icons/react'
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
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on')
  const [activeFile, setActiveFile] = useState('')

  useEffect(() => {
    if (snippets.length > 0 && !snippet) {
      router.replace('/')
    }
  }, [snippet, snippets.length, router])

  // Initialise activeFile when snippet loads (or changes)
  useEffect(() => {
    if (!snippet) return
    const defaultName = getFilename(snippet.title, snippet.language)
    const initial = snippet.entryPoint
      || (snippet.files?.length ? snippet.files[0].name : defaultName)
    setActiveFile(initial)
  }, [snippet?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!snippet) {
    return (
      <PageLayout>
        <div className="text-center py-20 text-muted-foreground">Loading…</div>
      </PageLayout>
    )
  }

  const filename = getFilename(snippet.title, snippet.language)
  const namespace = namespaces.find(n => n.id === snippet.namespaceId)
  const langBgClass = (LANGUAGE_COLORS[snippet.language] || LANGUAGE_COLORS['Other']).split(' ')[0]

  // Multi-file: use snippet.files if present, otherwise synthesise one entry
  const files = snippet.files && snippet.files.length > 0
    ? snippet.files
    : [{ name: filename, content: snippet.code }]

  // Active file content — drives Monaco
  const activeFileObj = files.find(f => f.name === activeFile) ?? files[0]
  const activeCode = activeFileObj?.content ?? snippet.code
  const lineCount = activeCode.split('\n').length

  // Synthetic snippet passed to SnippetViewerContent with the selected file's code
  const viewSnippet = { ...snippet, code: activeCode }

  // canPreview only makes sense on the entry-point file
  const isEntryFile = !activeFile || activeFile === (snippet.entryPoint ?? files[0]?.name)
  const canPreview = !!(isEntryFile && snippet.hasPreview && appConfig.previewEnabledLanguages.includes(snippet.language))
  const isPython = snippet.language === 'Python'

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode)
    toast.success(t.toast.codeCopied)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), appConfig.copiedTimeout)
  }

  return (
    <PageLayout>
      <div className={styles.page} data-testid="snippet-view-page">

        {/* Minimal top bar — back + title */}
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => router.push('/')} aria-label="Back to snippets">
            <ArrowLeft size={14} weight="bold" />
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

        {/* Toolbar */}
        <div className={styles.wordToolbar} role="toolbar" aria-label="Document toolbar">
          <div className={styles.toolGroup}>
            <button
              className={styles.toolBtn}
              onClick={() => router.push(`/snippet/${id}/edit`)}
              title="Edit this snippet"
              aria-label="Edit snippet"
            >
              <Pencil size={14} />
              <span>Edit</span>
            </button>
          </div>

          <div className={styles.toolSep} aria-hidden="true" />

          <div className={styles.toolGroup}>
            <button
              className={`${styles.toolBtn} ${isCopied ? styles.toolBtnPressed : ''}`}
              onClick={handleCopy}
              title="Copy active file to clipboard"
              aria-live="polite"
            >
              {isCopied
                ? <><Check size={14} weight="bold" /><span>Copied!</span></>
                : <><Copy size={14} /><span>Copy</span></>}
            </button>
          </div>

          <div className={styles.toolSep} aria-hidden="true" />

          <div className={styles.toolGroup}>
            <button
              className={`${styles.toolBtn} ${wordWrap === 'on' ? styles.toolBtnActive : ''}`}
              onClick={() => setWordWrap(w => w === 'on' ? 'off' : 'on')}
              title={wordWrap === 'on' ? 'Word wrap: ON' : 'Word wrap: OFF'}
              aria-pressed={wordWrap === 'on'}
            >
              <TextAlignLeft size={14} />
              <span>Wrap</span>
            </button>
            {canPreview && (
              <button
                className={`${styles.toolBtn} ${showPreview ? styles.toolBtnActive : ''}`}
                onClick={() => setShowPreview(p => !p)}
                title={showPreview ? 'Hide preview' : 'Show preview'}
                aria-pressed={showPreview}
              >
                <SplitVertical size={14} />
                <span>Preview</span>
              </button>
            )}
          </div>
        </div>

        {/* Work area: file tree left + editor right */}
        <div className={styles.workArea}>

          {/* File tree / Explorer panel */}
          <div className={styles.fileTree} aria-label="File explorer">
            <div className={styles.explorerHeader}>EXPLORER</div>
            <div className={styles.treeRoot}>
              <div className={styles.treeFolder}>
                <Folder size={13} weight="fill" className={styles.folderIcon} aria-hidden="true" />
                <span className={styles.folderName}>{snippet.title}</span>
              </div>
              <div className={styles.treeFiles}>
                {files.map(f => (
                  <button
                    key={f.name}
                    className={`${styles.treeFile} ${f.name === activeFile ? styles.treeFileActive : ''}`}
                    onClick={() => setActiveFile(f.name)}
                    title={f.name}
                    aria-pressed={f.name === activeFile}
                  >
                    <span className={`${styles.langDot} ${langBgClass}`} aria-hidden="true" />
                    <File size={12} aria-hidden="true" className={styles.fileIcon} />
                    <span className={styles.fileName}>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Monaco editor area */}
          <div className={styles.editorArea}>
            <SnippetViewerContent
              snippet={viewSnippet}
              canPreview={canPreview}
              showPreview={showPreview}
              isPython={isPython}
              wordWrap={wordWrap}
            />
          </div>
        </div>

        {/* Status bar */}
        <div className={styles.statusBar} role="status" aria-label="File information">
          <div className={styles.statusLeft}>
            <span className={styles.statusItem}>{snippet.language}</span>
            <span className={styles.statusSep} aria-hidden="true" />
            <span className={styles.statusItem}>{activeFile || filename}</span>
            <span className={styles.statusSep} aria-hidden="true" />
            <span className={styles.statusItem}>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
            {namespace && (
              <>
                <span className={styles.statusSep} aria-hidden="true" />
                <span className={styles.statusItem}>{namespace.name}</span>
              </>
            )}
          </div>
          <div className={styles.statusRight}>
            <span className={styles.statusItem}>Updated {relativeTime(snippet.updatedAt)}</span>
          </div>
        </div>

      </div>
    </PageLayout>
  )
}
