'use client'

import dynamic from 'next/dynamic'
import { FormLabel, Checkbox } from '@metabuilder/components/fakemui'
import { InputParameter, SnippetFile } from '@/lib/types'
import { appConfig } from '@/lib/config'
import { FileTree } from '@/components/features/file-tree/FileTree'
import styles from './code-editor-section.module.scss'

const MonacoEditor = dynamic(
  () => import('@/components/features/snippet-editor/MonacoEditor').then(m => ({ default: m.MonacoEditor })),
  { ssr: false }
)

const SplitScreenEditor = dynamic(
  () => import('@/components/features/snippet-editor/SplitScreenEditor').then(m => ({ default: m.SplitScreenEditor })),
  { ssr: false }
)

interface CodeEditorSectionProps {
  code: string
  language: string
  hasPreview: boolean
  functionName: string
  inputParameters: InputParameter[]
  errors: { code?: string }
  onCodeChange: (value: string) => void
  onPreviewChange: (checked: boolean) => void
  height?: string
  files: SnippetFile[]
  activeFile: string
  onActiveFileSelect: (name: string) => void
  onFileAdd: (name: string, content?: string) => void
  onFileDelete: (name: string) => void
  onFileRename: (oldName: string, newName: string) => void
  onFileUpload: (file: File) => void
}

export function CodeEditorSection({
  code,
  language,
  hasPreview,
  functionName,
  inputParameters,
  errors,
  onCodeChange,
  onPreviewChange,
  height,
  files,
  activeFile,
  onActiveFileSelect,
  onFileAdd,
  onFileDelete,
  onFileRename,
  onFileUpload,
}: CodeEditorSectionProps) {
  const isPreviewSupported = appConfig.previewEnabledLanguages.includes(language)
  const activeFileContent = files.find((f) => f.name === activeFile)?.content ?? code

  const handleEditorChange = (value: string) => {
    onCodeChange(value)
  }

  return (
    <div className="space-y-2">
      <div className={styles.codeHeader}>
        <FormLabel htmlFor="code">Code *</FormLabel>
        {isPreviewSupported && (
          <label
            htmlFor="hasPreview"
            className={`flex items-center gap-2 cursor-pointer ${styles.previewLabel}`}
            data-testid="enable-preview-label"
          >
            <Checkbox
              id="hasPreview"
              checked={hasPreview}
              onChange={(e) => onPreviewChange(e.target.checked)}
              data-testid="enable-preview-checkbox"
              aria-label="Enable live preview"
            />
            Live preview
          </label>
        )}
      </div>

      <div
        className={`rounded-md border ${
          errors.code ? 'border-destructive ring-2 ring-destructive/20' : 'border-border'
        } ${styles.editorWrapper}`}
        data-testid="code-editor-container"
        role="region"
        aria-label="Code editor"
        aria-invalid={!!errors.code}
        aria-describedby={errors.code ? 'code-error' : undefined}
      >
        <div className={styles.editorInner}>
          <FileTree
            files={files}
            activeFile={activeFile}
            onFileSelect={onActiveFileSelect}
            onFileAdd={onFileAdd}
            onFileDelete={onFileDelete}
            onFileRename={onFileRename}
            onFileUpload={onFileUpload}
          />

          <div className={styles.monacoWrapper}>
            {hasPreview && isPreviewSupported ? (
              <SplitScreenEditor
                value={activeFileContent}
                onChange={handleEditorChange}
                language={language}
                height={height ?? '340px'}
                functionName={functionName}
                inputParameters={inputParameters}
              />
            ) : (
              <MonacoEditor
                value={activeFileContent}
                onChange={handleEditorChange}
                language={language}
                height={height ?? '280px'}
              />
            )}
          </div>
        </div>
      </div>

      {errors.code && (
        <p className="text-sm text-destructive" id="code-error" data-testid="code-error-message" role="alert">
          {errors.code}
        </p>
      )}
    </div>
  )
}
