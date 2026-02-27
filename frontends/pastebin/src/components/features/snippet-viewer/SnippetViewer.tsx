"use client"

import { Dialog, DialogHeader, DialogContent } from '@metabuilder/components/fakemui'
import { Snippet } from '@/lib/types'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { appConfig } from '@/lib/config'
import { SnippetViewerHeader } from './SnippetViewerHeader'

// Dynamically import SnippetViewerContent to avoid SSR issues with Pyodide
const SnippetViewerContent = dynamic(
  () => import('./SnippetViewerContent').then(mod => ({ default: mod.SnippetViewerContent })),
  { ssr: false }
)

interface SnippetViewerProps {
  snippet: Snippet | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (snippet: Snippet) => void
  onCopy: (code: string) => void
}

export function SnippetViewer({ snippet, open, onOpenChange, onEdit, onCopy }: SnippetViewerProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  if (!snippet) return null

  const handleCopy = () => {
    onCopy(snippet.code)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), appConfig.copiedTimeout)
  }

  const handleEdit = () => {
    onOpenChange(false)
    onEdit(snippet)
  }

  const canPreview = !!(snippet.hasPreview && appConfig.previewEnabledLanguages.includes(snippet.language))
  const isPython = snippet.language === 'Python'

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="xl" fullWidth>
      <DialogHeader className="px-6 pt-6 pb-4 pr-14 border-b border-border">
        <SnippetViewerHeader
          snippet={snippet}
          isCopied={isCopied}
          canPreview={canPreview}
          showPreview={showPreview}
          onCopy={handleCopy}
          onEdit={handleEdit}
          onTogglePreview={() => setShowPreview(!showPreview)}
        />
      </DialogHeader>

      <DialogContent
        data-testid="snippet-viewer-dialog"
        className="sm:max-w-[95vw] sm:max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-0"
      >
        <div className="flex-1 overflow-hidden flex">
          <SnippetViewerContent
            snippet={snippet}
            canPreview={canPreview}
            showPreview={showPreview}
            isPython={isPython}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
