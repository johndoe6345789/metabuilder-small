import { getStorageConfig } from './storage'
import { getAuthToken } from './authToken'

const DBAL_TENANT = 'pastebin'
const DBAL_PACKAGE = 'pastebin'

function dbalBaseUrl(): string {
  return (getStorageConfig().dbalUrl ?? '').replace(/\/$/, '')
}

function entityUrl(entity: string): string {
  return `${dbalBaseUrl()}/${DBAL_TENANT}/${DBAL_PACKAGE}/${entity}`
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function getUserId(): string {
  const token = getAuthToken()
  if (!token) return ''
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub ?? ''
  } catch {
    return ''
  }
}

export type { Comment, SnippetComment, ProfileComment } from './types'

export interface UserProfile {
  id: string
  username: string
  bio: string
  createdAt: number
}

export async function fetchUserByUsername(username: string): Promise<UserProfile | null> {
  const url = `${entityUrl('User')}?filter.username=${encodeURIComponent(username)}&limit=1`
  const r = await fetch(url)
  if (!r.ok) return null
  const json = await r.json()
  const items = json.data?.data ?? json.data ?? []
  return items[0] ?? null
}

export async function updateMyProfile(bio: string): Promise<void> {
  const userId = getUserId()
  if (!userId) return
  await fetch(`${entityUrl('User')}/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ bio }),
  })
}
