'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { MarkdownRenderer } from '@/components/error/MarkdownRenderer'
import { ProfileComments } from '@/components/features/comments/ProfileComments'
import { fetchUserByUsername, UserProfile } from '@/lib/commentsApi'
import styles from './profile-page.module.scss'

function joinedDate(ms: number): string {
  if (!ms) return 'Unknown'
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    fetchUserByUsername(username).then(u => {
      if (!u) setNotFound(true)
      else setUser(u)
      setLoading(false)
    })
  }, [username])

  if (loading) {
    return <div className={styles.loading}>Loading profile…</div>
  }
  if (notFound || !user) {
    return <div className={styles.notFound}>User <strong>@{username}</strong> not found.</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <UserAvatar username={user.username} size="lg" />
        <div className={styles.info}>
          <h1 className={styles.username}>@{user.username}</h1>
          <p className={styles.joined}>Joined {joinedDate(user.createdAt)}</p>
        </div>
      </div>

      {user.bio && (
        <div className={styles.bio}>
          <MarkdownRenderer content={user.bio} animate={false} />
        </div>
      )}

      <ProfileComments profileUserId={user.id} />
    </div>
  )
}
