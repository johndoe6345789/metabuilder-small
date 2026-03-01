'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Copy, Check, SplitVertical, TextAlignLeft, File, Folder,
  Play, Stop, Terminal as TerminalIcon, FloppyDisk, X as XIcon, Pencil,
  Plus, Upload,
} from '@phosphor-icons/react'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/app/PageLayout'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { selectSnippets, selectNamespaces } from '@/store/selectors'
import { updateSnippet } from '@/store/slices/snippetsSlice'
import { LANGUAGE_COLORS, LANGUAGES, appConfig } from '@/lib/config'
import { useTranslation } from '@/hooks/useTranslation'
import { useCodeTerminal } from '@/hooks/useCodeTerminal'
import { useSnippetForm } from '@/hooks/useSnippetForm'
import { toast } from 'sonner'
import styles from './snippet-view-page.module.scss'

const SnippetViewerContent = dynamic(
  () => import('@/components/features/snippet-viewer/SnippetViewerContent').then(mod => ({ default: mod.SnippetViewerContent })),
  { ssr: false }
)

const CodeTerminal = dynamic(
  () => import('@/components/features/code-runner/CodeTerminal').then(mod => ({ default: mod.CodeTerminal })),
  { ssr: false }
)

const MonacoEditor = dynamic(
  () => import('@/components/features/snippet-editor/MonacoEditor').then(mod => ({ default: mod.MonacoEditor })),
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
  const [isEditing, setIsEditing] = useState(false)

  // Edit-mode inline file add state
  const [addingFile, setAddingFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const terminal = useCodeTerminal()
  // useSnippetForm re-seeds from snippet whenever isEditing changes (open param)
  const form = useSnippetForm(snippet, isEditing)

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

  if (!snippet) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#888' }}>Loading…</div>
      </PageLayout>
    )
  }

  const filename = getFilename(snippet.title, snippet.language)
  const namespace = namespaces.find(n => n.id === snippet.namespaceId)
  const langBgClass = (LANGUAGE_COLORS[snippet.language] || LANGUAGE_COLORS['Other']).split(' ')[0]

  // View-mode files (from saved snippet)
  const viewFiles = snippet.files && snippet.files.length > 0
    ? snippet.files
    : [{ name: filename, content: snippet.code }]

  // Active display state depends on edit mode
  const displayFiles = isEditing ? form.files : viewFiles
  const displayActiveFile = isEditing ? form.activeFile : activeFile
  const displayActiveFileObj = displayFiles.find(f => f.name === displayActiveFile) ?? displayFiles[0]
  const displayActiveCode = displayActiveFileObj?.content ?? snippet.code
  const lineCount = displayActiveCode.split('\n').length

  const viewSnippet = { ...snippet, code: displayActiveCode }
  const isEntryFile = !displayActiveFile || displayActiveFile === (snippet.entryPoint ?? displayFiles[0]?.name)
  const canPreview = !!(isEntryFile && snippet.hasPreview && appConfig.previewEnabledLanguages.includes(snippet.language))
  const isPython = snippet.language === 'Python'

  const handleCopy = () => {
    navigator.clipboard.writeText(displayActiveCode)
    toast.success(t.toast.codeCopied)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), appConfig.copiedTimeout)
  }

  const handleRun = () => {
    const languageRunnerMap: Record<string, string> =
      (appConfig as unknown as { languageRunnerMap: Record<string, string> }).languageRunnerMap ?? {}
    const runnerKey = languageRunnerMap[snippet.language]
      ?? snippet.language.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    terminal.handleRun(runnerKey, displayFiles, snippet.entryPoint ?? displayActiveFile)
    setActiveTab('terminal')
  }

  const handleSave = async () => {
    if (!form.validate()) return
    const data = form.getFormData()
    try {
      await dispatch(updateSnippet({ ...snippet, ...data })).unwrap()
      toast.success(t.toast.snippetUpdated)
      setIsEditing(false)
    } catch {
      toast.error(t.toast.failedToSaveSnippet)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setAddingFile(false)
    setNewFileName('')
  }

  function commitAddFile() {
    const name = newFileName.trim()
    if (name) form.addFile(name)
    setAddingFile(false)
    setNewFileName('')
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) form.uploadFile(file)
    e.target.value = ''
  }

  return (
    <PageLayout>
      <div className={styles.page} data-testid="snippet-view-page">

        {/* Top bar */}
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => router.push('/')} aria-label="Back to snippets">
            <ArrowLeft size={14} weight="bold" />
            <span>Back</span>
          </button>
          <div className={styles.titleGroup}>
            {isEditing ? (
              <>
                <input
                  className={styles.titleInput}
                  value={form.title}
                  onChange={e => form.setTitle(e.target.value)}
                  placeholder="Title"
                  aria-label="Snippet title"
                />
                <input
                  className={styles.descInput}
                  value={form.description}
                  onChange={e => form.setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  aria-label="Snippet description"
                />
              </>
            ) : (
              <>
                <h1 className={styles.pageTitle}>{snippet.title}</h1>
                {snippet.description && (
                  <span className={styles.titleDescription} title={snippet.description}>
                    {snippet.description}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.wordToolbar} role="toolbar" aria-label="Document toolbar">

          {/* Edit / Save / Cancel */}
          <div className={styles.toolGroup}>
            {isEditing ? (
              <>
                <button
                  className={`${styles.toolBtn} ${styles.toolBtnRun}`}
                  onClick={handleSave}
                  title="Save snippet"
                >
                  <FloppyDisk size={14} />
                  <span>Save</span>
                </button>
                <button
                  className={styles.toolBtn}
                  onClick={handleCancelEdit}
                  title="Discard changes"
                >
                  <XIcon size={14} />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <button
                className={styles.toolBtn}
                onClick={() => setIsEditing(true)}
                title="Edit snippet"
              >
                <Pencil size={14} />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* Language selector — edit mode only */}
          {isEditing && (
            <>
              <div className={styles.toolSep} aria-hidden="true" />
              <div className={styles.toolGroup}>
                <select
                  className={styles.langSelect}
                  value={form.language}
                  onChange={e => form.setLanguage(e.target.value)}
                  aria-label="Language"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </>
          )}

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
            {canPreview && !isEditing && (
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
        </div>

        {/* Work area */}
        <div className={styles.workArea}>

          {/* File tree — edit mode shows management controls */}
          {isEditing ? (
            <div className={styles.fileTreeEdit} aria-label="File explorer">
              <div className={styles.explorerHeader}>
                <span>EXPLORER</span>
                <div className={styles.explorerActions}>
                  <button
                    className={styles.explorerBtn}
                    onClick={() => setAddingFile(true)}
                    title="Add file"
                    aria-label="Add file"
                  >
                    <Plus size={13} weight="bold" />
                  </button>
                  <button
                    className={styles.explorerBtn}
                    onClick={() => uploadInputRef.current?.click()}
                    title="Upload file"
                    aria-label="Upload file"
                  >
                    <Upload size={13} weight="bold" />
                  </button>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                </div>
              </div>
              <div className={styles.treeRoot}>
                <div className={styles.treeFiles}>
                  {form.files.map(f => (
                    <div key={f.name} className={styles.editFileRow}>
                      <button
                        className={`${styles.treeFile} ${f.name === form.activeFile ? styles.treeFileActive : ''}`}
                        onClick={() => { form.setActiveFile(f.name); setActiveTab('code') }}
                        title={f.name}
                      >
                        <File size={12} aria-hidden="true" className={styles.fileIcon} />
                        <span className={styles.fileName}>{f.name}</span>
                      </button>
                      <button
                        className={styles.explorerBtn}
                        onClick={() => form.deleteFile(f.name)}
                        disabled={form.files.length <= 1}
                        title={`Delete ${f.name}`}
                        aria-label={`Delete ${f.name}`}
                      >
                        <XIcon size={11} />
                      </button>
                    </div>
                  ))}
                  {addingFile && (
                    <div className={styles.addFileRow}>
                      <input
                        className={styles.addFileInput}
                        value={newFileName}
                        onChange={e => setNewFileName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitAddFile()
                          if (e.key === 'Escape') { setAddingFile(false); setNewFileName('') }
                        }}
                        placeholder="filename.cpp"
                        autoFocus
                        aria-label="New file name"
                      />
                      <button className={styles.explorerBtn} onClick={commitAddFile} aria-label="Confirm">
                        <Check size={11} weight="bold" />
                      </button>
                      <button className={styles.explorerBtn} onClick={() => { setAddingFile(false); setNewFileName('') }} aria-label="Cancel">
                        <XIcon size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.fileTree} aria-label="File explorer">
              <div className={styles.explorerHeader}>EXPLORER</div>
              <div className={styles.treeRoot}>
                <div className={styles.treeFolder}>
                  <Folder size={13} weight="fill" className={styles.folderIcon} aria-hidden="true" />
                  <span className={styles.folderName}>{snippet.title}</span>
                </div>
                <div className={styles.treeFiles}>
                  {viewFiles.map(f => (
                    <button
                      key={f.name}
                      className={`${styles.treeFile} ${f.name === activeFile ? styles.treeFileActive : ''}`}
                      onClick={() => { setActiveFile(f.name); setActiveTab('code') }}
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
          )}

          {/* Editor column */}
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
                <span>{displayActiveFile || filename}</span>
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
              {isEditing ? (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <MonacoEditor
                    value={displayActiveCode}
                    onChange={v => form.updateFileContent(displayActiveFile, v)}
                    language={form.language}
                    height="100%"
                    wordWrap={wordWrap}
                  />
                </div>
              ) : (
                <SnippetViewerContent
                  snippet={viewSnippet}
                  canPreview={canPreview}
                  showPreview={showPreview}
                  isPython={isPython}
                  wordWrap={wordWrap}
                />
              )}
            </div>

            {/* Terminal panel */}
            <div
              className={`${styles.editorPanel} ${activeTab === 'terminal' ? styles.editorPanelVisible : styles.editorPanelHidden}`}
              role="tabpanel"
            >
              <CodeTerminal
                language={snippet.language}
                files={displayFiles}
                entryPoint={snippet.entryPoint ?? displayActiveFile}
                controller={terminal}
              />
            </div>

          </div>
        </div>

        {/* Status bar */}
        <div className={styles.statusBar} role="status" aria-label="File information">
          <div className={styles.statusLeft}>
            <span className={styles.statusItem}>{isEditing ? form.language : snippet.language}</span>
            <span className={styles.statusSep} aria-hidden="true" />
            <span className={styles.statusItem}>{displayActiveFile || filename}</span>
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
            {isEditing && <span className={styles.statusItem} style={{ color: '#f4c96a' }}>● Editing</span>}
            {terminal.isRunning && <span className={styles.statusItem} style={{ color: '#6ec87a' }}>● Running</span>}
            <span className={styles.statusItem}>Updated {relativeTime(snippet.updatedAt)}</span>
          </div>
        </div>

      </div>
    </PageLayout>
  )
}
