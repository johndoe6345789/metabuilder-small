import { getStorageConfig } from './storage'
import { getAuthToken } from './authToken'

function baseUrl(): string {
  return (getStorageConfig().dbalUrl ?? '').replace(/\/$/, '')
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface Comment {
  id: string
  authorId: string
  authorUsername: string
  content: string
  createdAt: number
}

export interface SnippetComment extends Comment {
  snippetId: string
}

export interface ProfileComment extends Comment {
  profileUserId: string
}

export interface UserProfile {
  id: string
  username: string
  bio: string
  createdAt: number
}

export async function fetchUserByUsername(username: string): Promise<UserProfile | null> {
  const url = `${baseUrl()}/api/users/${encodeURIComponent(username)}`
  const r = await fetch(url)
  if (!r.ok) return null
  return r.json()
}

export async function updateMyProfile(bio: string): Promise<void> {
  const url = `${baseUrl()}/api/users/me/profile`
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ bio }),
  })
}

export async function fetchSnippetComments(snippetId: string): Promise<SnippetComment[]> {
  const url = `${baseUrl()}/api/comments/snippet/${encodeURIComponent(snippetId)}`
  const r = await fetch(url)
  if (!r.ok) return []
  return r.json()
}

export async function createSnippetComment(snippetId: string, content: string): Promise<SnippetComment | null> {
  const url = `${baseUrl()}/api/comments/snippet/${encodeURIComponent(snippetId)}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  })
  if (!r.ok) return null
  return r.json()
}

export async function fetchProfileComments(profileUserId: string): Promise<ProfileComment[]> {
  const url = `${baseUrl()}/api/comments/profile/${encodeURIComponent(profileUserId)}`
  const r = await fetch(url)
  if (!r.ok) return []
  return r.json()
}

export async function createProfileComment(profileUserId: string, content: string): Promise<ProfileComment | null> {
  const url = `${baseUrl()}/api/comments/profile/${encodeURIComponent(profileUserId)}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  })
  if (!r.ok) return null
  return r.json()
}
