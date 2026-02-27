'use client'

import dynamic from 'next/dynamic'
import { FormLabel, Checkbox } from '@metabuilder/components/fakemui'
import { InputParameter } from '@/lib/types'
import { appConfig } from '@/lib/config'

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
}: CodeEditorSectionProps) {
  const isPreviewSupported = appConfig.previewEnabledLanguages.includes(language)

  return (
    <div className="space-y-2">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <FormLabel htmlFor="code">Code *</FormLabel>
        {isPreviewSupported && (
          <label
            htmlFor="hasPreview"
            className="flex items-center gap-2 cursor-pointer"
            style={{ fontSize: '0.875rem', color: 'var(--mat-sys-on-surface-variant)' }}
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

      {hasPreview && isPreviewSupported ? (
        <div
          className={errors.code ? 'ring-2 ring-destructive/20 rounded-md' : ''}
          data-testid="split-screen-editor-container"
          role="region"
          aria-label="Code editor with split screen view"
        >
          <SplitScreenEditor
            value={code}
            onChange={onCodeChange}
            language={language}
            height={height ?? '340px'}
            functionName={functionName}
            inputParameters={inputParameters}
          />
        </div>
      ) : (
        <div
          className={`rounded-md border ${
            errors.code ? 'border-destructive ring-2 ring-destructive/20' : 'border-border'
          }`}
          data-testid="code-editor-container"
          role="region"
          aria-label="Code editor"
          aria-invalid={!!errors.code}
          aria-describedby={errors.code ? "code-error" : undefined}
        >
          <MonacoEditor value={code} onChange={onCodeChange} language={language} height={height ?? '280px'} />
        </div>
      )}
      {errors.code && (
        <p className="text-sm text-destructive" id="code-error" data-testid="code-error-message" role="alert">
          {errors.code}
        </p>
      )}
    </div>
  )
}
