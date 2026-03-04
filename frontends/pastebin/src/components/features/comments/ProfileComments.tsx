'use client'

import { useEffect, useState } from 'react'
import { ProfileComment, fetchProfileComments, createProfileComment } from '@/lib/commentsApi'
import { useAppSelector } from '@/store/hooks'
import { selectIsAuthenticated } from '@/store/selectors'
import { CommentItem } from './CommentItem'
import { CommentForm } from './CommentForm'
import styles from './comments.module.scss'

interface ProfileCommentsProps {
  profileUserId: string
}

export function ProfileComments({ profileUserId }: ProfileCommentsProps) {
  const [comments, setComments] = useState<ProfileComment[]>([])
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  useEffect(() => {
    fetchProfileComments(profileUserId).then(setComments)
  }, [profileUserId])

  async function handleSubmit(content: string) {
    const created = await createProfileComment(profileUserId, content)
    if (created) setComments(prev => [...prev, created])
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Comments</h2>
      <div className={styles.list}>
        {comments.length === 0
          ? <p className={styles.empty}>No comments yet. Be the first!</p>
          : comments.map(c => <CommentItem key={c.id} comment={c} />)
        }
      </div>
      {isAuthenticated && <CommentForm onSubmit={handleSubmit} />}
    </section>
  )
}
