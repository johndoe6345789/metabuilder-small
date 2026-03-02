'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Copy, Check, Pencil, SplitVertical, TextAlignLeft, File, Folder,
  Play, Stop, Terminal as TerminalIcon, FilePlus, TrashSimple, LinkSimple,
  Keyboard,
} from '@phosphor-icons/react'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/app/PageLayout'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { selectSnippets, selectNamespaces } from '@/store/selectors'
import { updateSnippet } from '@/store/slices/snippetsSlice'
import { LANGUAGE_COLORS, appConfig } from '@/lib/config'
import { useTranslation } from '@/hooks/useTranslation'
import { useCodeTerminal } from '@/hooks/useCodeTerminal'
import { Snippet } from '@/lib/types'
import { toast } from 'sonner'
import type { Icon } from '@phosphor-icons/react'
import { FileCommandPalette, CommandItem } from '@/components/features/file-ops/FileCommandPalette'
import styles from './snippet-view-page.module.scss'

const SnippetViewerContent = dynamic(
  () => import('@/components/features/snippet-viewer/SnippetViewerContent').then(mod => ({ default: mod.SnippetViewerContent })),
  { ssr: false }
)

const CodeTerminal = dynamic(
  () => import('@/components/features/code-runner/CodeTerminal').then(mod => ({ default: mod.CodeTerminal })),
  { ssr: false }
)

const SnippetDialog = dynamic(
  () => import('@/components/features/snippet-editor/SnippetDialog').then(mod => ({ default: mod.SnippetDialog })),
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

type ActiveTab = 'code' | 'terminal'

export default function SnippetViewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslation()
  const dispatch = useAppDispatch()
  const snippets = useAppSelector(selectSnippets)
  const namespaces = useAppSelector(selectNamespaces)
  const snippet = snippets.find(s => s.id === id) ?? null

  const [isCopied, setIsCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on')
  const [activeFile, setActiveFile] = useState('')
  const [activeTab, setActiveTab] = useState<ActiveTab>('code')
  const [editOpen, setEditOpen] = useState(false)

  // Command palette
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Inline rename state
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // New file inline input state
  const [addingFile, setAddingFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const newFileInputRef = useRef<HTMLInputElement>(null)

  const terminal = useCodeTerminal()

  useEffect(() => {
    if (snippets.length > 0 && !snippet) {
      router.replace('/')
    }
  }, [snippet, snippets.length, router])

  useEffect(() => {
    if (!snippet) return
    const defaultName = getFilename(snippet.title, snippet.language)
    const initial = snippet.entryPoint
      || (snippet.files?.length ? snippet.files[0].name : defaultName)
    setActiveFile(initial)
  }, [snippet?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
      }
      if (e.key === 'F2' && activeFile && !paletteOpen && !renaming) {
        e.preventDefault()
        setRenaming(activeFile)
        setRenameValue(activeFile)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeFile, paletteOpen, renaming])

  if (!snippet) {
    return (
      <PageLayout>
        <div className={styles.loading}>Loading…</div>
      </PageLayout>
    )
  }

  const filename = getFilename(snippet.title, snippet.language)
  const namespace = namespaces.find(n => n.id === snippet.namespaceId)
  const langBgClass = (LANGUAGE_COLORS[snippet.language] || LANGUAGE_COLORS['Other']).split(' ')[0]

  const files = snippet.files && snippet.files.length > 0
    ? snippet.files
    : [{ name: filename, content: snippet.code }]

  const activeFileObj = files.find(f => f.name === activeFile) ?? files[0]
  const activeCode = activeFileObj?.content ?? snippet.code
  const lineCount = activeCode.split('\n').length

  const viewSnippet = { ...snippet, code: activeCode }
  const isEntryFile = !activeFile || activeFile === (snippet.entryPoint ?? files[0]?.name)
  const canPreview = !!(isEntryFile && snippet.hasPreview && appConfig.previewEnabledLanguages.includes(snippet.language))
  const isPython = snippet.language === 'Python'

  // ── Clipboard ─────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode)
    toast.success(t.toast.codeCopied)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), appConfig.copiedTimeout)
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(`/${id}/${activeFile}`)
    toast.success('Path copied to clipboard')
  }

  // ── Run / Stop ────────────────────────────────────────────────
  const handleRun = () => {
    const languageRunnerMap: Record<string, string> =
      (appConfig as unknown as { languageRunnerMap: Record<string, string> }).languageRunnerMap ?? {}
    const runnerKey = languageRunnerMap[snippet.language]
      ?? snippet.language.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    terminal.handleRun(runnerKey, files, snippet.entryPoint ?? activeFile)
    setActiveTab('terminal')
  }

  // ── Snippet metadata save ─────────────────────────────────────
  const handleSave = async (data: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await dispatch(updateSnippet({ ...snippet, ...data })).unwrap()
      toast.success(t.toast.snippetUpdated)
    } catch {
      toast.error(t.toast.failedToSaveSnippet)
    }
  }

  // ── File operations ───────────────────────────────────────────
  const handleNewFile = () => {
    setAddingFile(true)
    setNewFileName('')
    setTimeout(() => newFileInputRef.current?.focus(), 10)
  }

  const commitNewFile = async () => {
    const name = newFileName.trim()
    setAddingFile(false)
    if (!name) return
    const currentFiles = snippet.files && snippet.files.length > 0
      ? snippet.files
      : [{ name: filename, content: snippet.code }]
    if (currentFiles.some(f => f.name === name)) {
      toast.error(`File "${name}" already exists`)
      return
    }
    try {
      await dispatch(updateSnippet({ ...snippet, files: [...currentFiles, { name, content: '' }] })).unwrap()
      setActiveFile(name)
      setActiveTab('code')
    } catch {
      toast.error('Failed to create file')
    }
  }

  const handleNewFileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitNewFile() }
    if (e.key === 'Escape') { e.preventDefault(); setAddingFile(false) }
  }

  const handleStartRename = (name: string) => {
    setRenaming(name)
    setRenameValue(name)
  }

  const commitRename = async () => {
    const oldName = renaming
    setRenaming(null)
    if (!oldName) return
    const newName = renameValue.trim()
    if (!newName || newName === oldName) return
    if (files.some(f => f.name === newName)) {
      toast.error(`File "${newName}" already exists`)
      return
    }
    const newFiles = files.map(f => f.name === oldName ? { ...f, name: newName } : f)
    const newEntry = snippet.entryPoint === oldName ? newName : snippet.entryPoint
    try {
      await dispatch(updateSnippet({ ...snippet, files: newFiles, entryPoint: newEntry })).unwrap()
      if (activeFile === oldName) setActiveFile(newName)
    } catch {
      toast.error('Failed to rename file')
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitRename() }
    if (e.key === 'Escape') { e.preventDefault(); setRenaming(null) }
  }

  const handleDeleteFile = async (name: string) => {
    if (files.length <= 1) { toast.error('Cannot delete the last file'); return }
    const newFiles = files.filter(f => f.name !== name)
    const newEntry = snippet.entryPoint === name ? newFiles[0]?.name : snippet.entryPoint
    try {
      await dispatch(updateSnippet({ ...snippet, files: newFiles, entryPoint: newEntry })).unwrap()
      if (activeFile === name) setActiveFile(newFiles[0]?.name ?? '')
      toast.success(`Deleted ${name}`)
    } catch {
      toast.error('Failed to delete file')
    }
  }

  const handleDuplicateFile = async (name: string) => {
    const file = files.find(f => f.name === name)
    if (!file) return
    const ext = name.includes('.') ? `.${name.split('.').pop()}` : ''
    const base = name.replace(/\.[^.]+$/, '')
    const dupName = `${base}-copy${ext}`
    try {
      await dispatch(updateSnippet({ ...snippet, files: [...files, { name: dupName, content: file.content }] })).unwrap()
      setActiveFile(dupName)
      toast.success(`Duplicated as ${dupName}`)
    } catch {
      toast.error('Failed to duplicate file')
    }
  }

  // ── Command palette commands ───────────────────────────────────
  const commands: CommandItem[] = [
    // FILE group
    { id: 'new-file', label: 'New File', icon: FilePlus, shortcut: '⌘N', group: 'FILE',
      action: handleNewFile },
    { id: 'rename-file', label: 'Rename File', icon: Pencil, shortcut: 'F2', group: 'FILE',
      action: () => handleStartRename(activeFile) },
    { id: 'duplicate-file', label: 'Duplicate File', icon: Copy, shortcut: '⌘D', group: 'FILE',
      action: () => handleDuplicateFile(activeFile) },
    { id: 'delete-file', label: 'Delete File', icon: TrashSimple, shortcut: '⌦', group: 'FILE',
      action: () => handleDeleteFile(activeFile), disabled: files.length <= 1, danger: true },
    { id: 'copy-path', label: 'Copy File Path', icon: LinkSimple, shortcut: '⌥⌘C', group: 'FILE',
      action: handleCopyPath },

    // CLIPBOARD group
    { id: 'copy-code', label: 'Copy Code', icon: Copy, shortcut: '⌘C', group: 'CLIPBOARD',
      action: handleCopy },

    // VIEW group
    { id: 'toggle-wrap', label: 'Toggle Word Wrap', icon: TextAlignLeft, shortcut: '⌥Z', group: 'VIEW',
      action: () => setWordWrap(w => w === 'on' ? 'off' : 'on') },
    { id: 'toggle-preview', label: 'Toggle Preview', icon: SplitVertical, shortcut: '⌘\\', group: 'VIEW',
      action: () => setShowPreview(p => !p), disabled: !canPreview },
    { id: 'focus-editor', label: 'Focus Editor', icon: File, shortcut: '⌘1', group: 'VIEW',
      action: () => setActiveTab('code') },
    { id: 'focus-terminal', label: 'Focus Terminal', icon: TerminalIcon, shortcut: '⌃`', group: 'VIEW',
      action: () => setActiveTab('terminal') },

    // RUN group
    { id: 'run-code', label: 'Run Code', icon: Play, shortcut: 'F5', group: 'RUN',
      action: handleRun, disabled: terminal.isRunning },
    { id: 'stop-execution', label: 'Stop Execution', icon: Stop, shortcut: '⌃C', group: 'RUN',
      action: terminal.handleStop, disabled: !terminal.isRunning },

    // NAVIGATE group
    { id: 'edit-metadata', label: 'Edit Snippet Metadata', icon: Pencil, shortcut: '', group: 'NAVIGATE',
      action: () => setEditOpen(true) },
    { id: 'go-back', label: 'Back to Snippets', icon: ArrowLeft, shortcut: '⌘←', group: 'NAVIGATE',
      action: () => router.push('/') },
  ]

  return (
    <PageLayout>
      <div className={styles.page} data-testid="snippet-view-page">

        {/* Minimal top bar */}
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
          {/* Edit */}
          <div className={styles.toolGroup}>
            <button className={styles.toolBtn} onClick={() => setEditOpen(true)} title="Edit snippet">
              <Pencil size={14} />
              <span>Edit</span>
            </button>
          </div>

          <div className={styles.toolSep} aria-hidden="true" />

          {/* Clipboard */}
          <div className={styles.toolGroup}>
            <button
              className={`${styles.toolBtn} ${isCopied ? styles.toolBtnPressed : ''}`}
              onClick={handleCopy}
              title="Copy active file"
              aria-live="polite"
            >
              {isCopied
                ? <><Check size={14} weight="bold" /><span>Copied!</span></>
                : <><Copy size={14} /><span>Copy</span></>}
            </button>
          </div>

          <div className={styles.toolSep} aria-hidden="true" />

          {/* View */}
          <div className={styles.toolGroup}>
            <button
              className={`${styles.toolBtn} ${wordWrap === 'on' ? styles.toolBtnActive : ''}`}
              onClick={() => setWordWrap(w => w === 'on' ? 'off' : 'on')}
              title="Toggle word wrap"
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

          <div className={styles.toolSep} aria-hidden="true" />

          {/* Run / Stop */}
          <div className={styles.toolGroup}>
            <button
              className={`${styles.toolBtn} ${styles.toolBtnRun}`}
              onClick={handleRun}
              disabled={terminal.isRunning}
              title="Run code"
            >
              <Play size={14} weight="fill" />
              <span>{terminal.isRunning ? 'Running…' : 'Run'}</span>
            </button>
            <button
              className={`${styles.toolBtn} ${styles.toolBtnStop}`}
              onClick={terminal.handleStop}
              disabled={!terminal.isRunning}
              title="Stop execution"
            >
              <Stop size={14} weight="fill" />
              <span>Stop</span>
            </button>
          </div>

          {/* Command palette trigger — pushes to right edge */}
          <button
            className={styles.paletteTrigger}
            onClick={() => setPaletteOpen(true)}
            title="Open command palette"
            aria-label="Open command palette"
          >
            <Keyboard size={13} />
            <span>Commands</span>
            <kbd>⌘K</kbd>
          </button>
        </div>

        {/* Work area */}
        <div className={styles.workArea}>

          {/* File tree */}
          <div className={styles.fileTree} aria-label="File explorer">
            {/* Explorer header with hover-revealed New File button */}
            <div className={styles.explorerHeader}>
              <span>EXPLORER</span>
              <div className={styles.explorerActions}>
                <button
                  className={styles.explorerAction}
                  onClick={handleNewFile}
                  title="New File"
                  aria-label="New File"
                >
                  <FilePlus size={13} />
                </button>
              </div>
            </div>

            <div className={styles.treeRoot}>
              <div className={styles.treeFolder}>
                <Folder size={13} weight="fill" className={styles.folderIcon} aria-hidden="true" />
                <span className={styles.folderName}>{snippet.title}</span>
              </div>

              <div className={styles.treeFiles}>
                {files.map(f => (
                  <div
                    key={f.name}
                    className={`${styles.treeFileRow} ${f.name === activeFile ? styles.treeFileRowActive : ''}`}
                  >
                    {renaming === f.name ? (
                      /* Inline rename input */
                      <input
                        className={styles.renameInput}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={commitRename}
                        autoFocus
                        aria-label={`Rename ${f.name}`}
                        spellCheck={false}
                      />
                    ) : (
                      <>
                        {/* File select button */}
                        <button
                          className={styles.treeFileBtn}
                          onClick={() => { setActiveFile(f.name); setActiveTab('code') }}
                          title={f.name}
                          aria-pressed={f.name === activeFile}
                        >
                          <span className={`${styles.langDot} ${langBgClass}`} aria-hidden="true" />
                          <File size={12} aria-hidden="true" className={styles.fileIcon} />
                          <span className={styles.fileName}>{f.name}</span>
                        </button>

                        {/* Hover-revealed action icons */}
                        <div className={styles.fileActions} aria-hidden="true">
                          <button
                            className={styles.fileAction}
                            onClick={e => { e.stopPropagation(); handleStartRename(f.name) }}
                            title="Rename file (F2)"
                            tabIndex={-1}
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            className={`${styles.fileAction} ${styles.fileActionDanger}`}
                            onClick={e => { e.stopPropagation(); handleDeleteFile(f.name) }}
                            title="Delete file"
                            tabIndex={-1}
                            disabled={files.length <= 1}
                          >
                            <TrashSimple size={11} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* New file inline input */}
                {addingFile && (
                  <div className={styles.treeFileRow}>
                    <File size={12} aria-hidden="true" className={styles.fileIcon} />
                    <input
                      ref={newFileInputRef}
                      className={styles.renameInput}
                      placeholder="filename.ext"
                      value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                      onKeyDown={handleNewFileKeyDown}
                      onBlur={commitNewFile}
                      aria-label="New file name"
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor + Terminal with tab bar */}
          <div className={styles.editorColumn}>

            {/* Tab bar */}
            <div className={styles.editorTabBar} role="tablist">
              <button
                className={`${styles.editorTab} ${activeTab === 'code' ? styles.editorTabActive : ''}`}
                role="tab"
                aria-selected={activeTab === 'code'}
                onClick={() => setActiveTab('code')}
              >
                <File size={12} aria-hidden="true" />
                <span>{activeFile || filename}</span>
              </button>
              <button
                className={`${styles.editorTab} ${activeTab === 'terminal' ? styles.editorTabActive : ''}`}
                role="tab"
                aria-selected={activeTab === 'terminal'}
                onClick={() => setActiveTab('terminal')}
              >
                <TerminalIcon size={12} aria-hidden="true" />
                <span>Terminal</span>
                {terminal.isRunning && <span className={styles.runningDot} aria-hidden="true" />}
              </button>
              <div className={styles.editorTabRail} aria-hidden="true" />
            </div>

            {/* Code panel */}
            <div
              className={`${styles.editorPanel} ${activeTab === 'code' ? styles.editorPanelVisible : styles.editorPanelHidden}`}
              role="tabpanel"
            >
              <SnippetViewerContent
                snippet={viewSnippet}
                canPreview={canPreview}
                showPreview={showPreview}
                isPython={isPython}
                wordWrap={wordWrap}
              />
            </div>

            {/* Terminal panel */}
            <div
              className={`${styles.editorPanel} ${activeTab === 'terminal' ? styles.editorPanelVisible : styles.editorPanelHidden}`}
              role="tabpanel"
            >
              <CodeTerminal
                language={snippet.language}
                files={files}
                entryPoint={snippet.entryPoint ?? activeFile}
                controller={terminal}
              />
            </div>

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
            {terminal.isRunning && (
              <span className={`${styles.statusItem} ${styles.statusRunning}`}>● Running</span>
            )}
            <span className={styles.statusItem}>Updated {relativeTime(snippet.updatedAt)}</span>
          </div>
        </div>

        {/* Edit dialog */}
        <SnippetDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          editingSnippet={snippet}
          onSave={handleSave}
          metadataOnly
        />

        {/* Command palette */}
        <FileCommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          commands={commands}
        />

      </div>
    </PageLayout>
  )
}
