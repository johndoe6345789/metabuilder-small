import { useTranslation } from '@/hooks/useTranslation'

interface SnippetCodePreviewProps {
  displayCode: string
  isTruncated: boolean
}

export function SnippetCodePreview({ displayCode, isTruncated }: SnippetCodePreviewProps) {
  const t = useTranslation()
  return (
    <div className="rounded-md bg-secondary/30 p-3 border border-border" data-testid="snippet-code-preview">
      <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words font-mono" data-testid="code-preview-content">
        {displayCode}
      </pre>
      {isTruncated && (
        <p className="text-xs text-accent mt-2" role="status" data-testid="code-truncated-notice">
          {t.snippetCard.viewFullCode}
        </p>
      )}
    </div>
  )
}
