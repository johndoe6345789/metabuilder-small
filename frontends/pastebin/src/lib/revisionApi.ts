import { getStorageConfig } from './storage'
import { getAuthToken } from './authToken'
import type { Snippet, SnippetRevision } from './types'

function baseUrl(): string {
  return (getStorageConfig().flaskUrl ?? '').replace(/\/$/, '')
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchRevisions(snippetId: string): Promise<SnippetRevision[]> {
  const r = await fetch(`${baseUrl()}/api/snippets/${encodeURIComponent(snippetId)}/revisions`, {
    headers: { ...authHeaders() },
  })
  if (!r.ok) return []
  return r.json()
}

export async function revertToRevision(snippetId: string, revisionId: string): Promise<Snippet | null> {
  const r = await fetch(
    `${baseUrl()}/api/snippets/${encodeURIComponent(snippetId)}/revisions/${encodeURIComponent(revisionId)}/revert`,
    { method: 'POST', headers: { ...authHeaders() } },
  )
  if (!r.ok) return null
  return r.json()
}

export async function forkSnippet(snippetId: string, title: string): Promise<Snippet | null> {
  const r = await fetch(`${baseUrl()}/api/snippets/${encodeURIComponent(snippetId)}/fork`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title }),
  })
  if (!r.ok) return null
  return r.json()
}

export async function forkSharedSnippet(token: string, title: string): Promise<Snippet | null> {
  const r = await fetch(`${baseUrl()}/api/share/${encodeURIComponent(token)}/fork`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title }),
  })
  if (!r.ok) return null
  return r.json()
}
