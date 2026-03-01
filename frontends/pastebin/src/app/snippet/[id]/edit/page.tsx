'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageLayout } from '@/app/PageLayout'
import { SnippetEditorPage } from '@/components/features/snippet-editor/SnippetEditorPage'
import { useAppSelector } from '@/store/hooks'
import { selectSnippets } from '@/store/selectors'

export default function EditSnippetPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const snippets = useAppSelector(selectSnippets)
  const snippet = snippets.find(s => s.id === id) ?? null

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

  return (
    <PageLayout>
      <SnippetEditorPage initialSnippet={snippet} />
    </PageLayout>
  )
}
