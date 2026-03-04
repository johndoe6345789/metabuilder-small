'use client'

import { useEffect, useState } from 'react'
import { SnippetComment, fetchSnippetComments, createSnippetComment } from '@/lib/commentsApi'
import { useAppSelector } from '@/store/hooks'
import { selectIsAuthenticated } from '@/store/selectors'
import { CommentItem } from './CommentItem'
import { CommentForm } from './CommentForm'
import styles from './comments.module.scss'

interface SnippetCommentsProps {
  snippetId: string
}

export function SnippetComments({ snippetId }: SnippetCommentsProps) {
  const [comments, setComments] = useState<SnippetComment[]>([])
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  useEffect(() => {
    fetchSnippetComments(snippetId).then(setComments)
  }, [snippetId])

  async function handleSubmit(content: string) {
    const created = await createSnippetComment(snippetId, content)
    if (created) setComments(prev => [...prev, created])
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Comments</h2>
      <div className={styles.list}>
        {comments.length === 0
          ? <p className={styles.empty}>No comments yet.</p>
          : comments.map(c => <CommentItem key={c.id} comment={c} />)
        }
      </div>
      {isAuthenticated && (
        <CommentForm onSubmit={handleSubmit} placeholder="Comment on this snippet… (markdown supported)" />
      )}
    </section>
  )
}
