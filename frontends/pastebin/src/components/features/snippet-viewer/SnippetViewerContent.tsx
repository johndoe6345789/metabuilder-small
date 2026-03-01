import { Snippet } from '@/lib/types'
import { MonacoEditor } from '@/components/features/snippet-editor/MonacoEditor'
import { ReactPreview } from '@/components/features/snippet-editor/ReactPreview'
import { PythonOutput } from '@/components/features/python-runner/PythonOutput'

interface SnippetViewerContentProps {
  snippet: Snippet
  canPreview: boolean
  showPreview: boolean
  isPython: boolean
}

export function SnippetViewerContent({
  snippet,
  canPreview,
  showPreview,
  isPython,
}: SnippetViewerContentProps) {
  if (canPreview && showPreview) {
    return (
      <>
        <div
          style={{ flex: 1, overflow: 'hidden', borderRight: '1px solid var(--mat-sys-outline-variant, #cac7d0)' }}
          data-testid="viewer-code-pane"
          role="region"
          aria-label="Code viewer"
        >
          <MonacoEditor
            value={snippet.code}
            onChange={() => {}}
            language={snippet.language}
            height="100%"
            readOnly={true}
          />
        </div>
        <div
          style={{ flex: 1, overflow: 'hidden' }}
          data-testid="viewer-preview-pane"
          role="region"
          aria-label={`Preview pane - ${isPython ? 'Python output' : 'React preview'}`}
        >
          {isPython ? (
            <PythonOutput code={snippet.code} />
          ) : (
            <ReactPreview
              code={snippet.code}
              language={snippet.language}
              functionName={snippet.functionName}
              inputParameters={snippet.inputParameters}
            />
          )}
        </div>
      </>
    )
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden' }} data-testid="viewer-code-full" role="region" aria-label="Full code viewer">
      <MonacoEditor
        value={snippet.code}
        onChange={() => {}}
        language={snippet.language}
        height="100%"
        readOnly={true}
      />
    </div>
  )
}
