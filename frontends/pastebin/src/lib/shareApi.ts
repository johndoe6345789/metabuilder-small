import { getStorageConfig } from './storage'
import { getAuthToken } from './authToken'
import type { Snippet } from './types'

function baseUrl(): string {
  return (getStorageConfig().flaskUrl ?? '').replace(/\/$/, '')
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface SharedSnippet extends Snippet {
  authorUsername?: string
}

export async function generateShareToken(snippetId: string): Promise<string | null> {
  const r = await fetch(`${baseUrl()}/api/snippets/${encodeURIComponent(snippetId)}/share`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  if (!r.ok) return null
  const data = await r.json()
  return data.token ?? null
}

export async function revokeShareToken(snippetId: string): Promise<void> {
  await fetch(`${baseUrl()}/api/snippets/${encodeURIComponent(snippetId)}/share`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
}

export async function fetchSharedSnippet(token: string): Promise<SharedSnippet | null> {
  const r = await fetch(`${baseUrl()}/api/share/${encodeURIComponent(token)}`)
  if (!r.ok) return null
  return r.json()
}
