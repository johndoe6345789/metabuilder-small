import type { Snippet, Namespace } from './types'
import { getAuthToken } from './authToken'

export type StorageBackend = 'indexeddb' | 'flask' | 'dbal'

export interface StorageConfig {
  backend: StorageBackend
  flaskUrl?: string
  dbalUrl?: string
}

const STORAGE_CONFIG_KEY = 'codesnippet-storage-config'

function getDefaultConfig(): StorageConfig {
  const dbalUrl = process.env.NEXT_PUBLIC_DBAL_API_URL
  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_BACKEND_URL

  if (dbalUrl) {
    return { backend: 'dbal', dbalUrl, flaskUrl }
  }
  if (flaskUrl) {
    return { backend: 'flask', flaskUrl }
  }
  return { backend: 'indexeddb' }
}

let currentConfig: StorageConfig = getDefaultConfig()

export function loadStorageConfig(): StorageConfig {
  const defaultConfig = getDefaultConfig()

  if (defaultConfig.backend === 'dbal' && defaultConfig.dbalUrl) {
    currentConfig = defaultConfig
    return currentConfig
  }
  if (defaultConfig.backend === 'flask' && defaultConfig.flaskUrl) {
    currentConfig = defaultConfig
    return currentConfig
  }
  
  try {
    const saved = localStorage.getItem(STORAGE_CONFIG_KEY)
    if (saved) {
      currentConfig = JSON.parse(saved)
    }
  } catch (error) {
    console.warn('Failed to load storage config:', error)
  }
  return currentConfig
}

export function saveStorageConfig(config: StorageConfig): void {
  currentConfig = config
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn('Failed to save storage config:', error)
  }
}

export function getStorageConfig(): StorageConfig {
  return currentConfig
}

export class FlaskStorageAdapter {
  private baseUrl: string

  constructor(baseUrl: string) {
    if (!baseUrl || baseUrl.trim() === '') {
      throw new Error('Flask backend URL cannot be empty')
    }
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  private authHeader(): Record<string, string> {
    const t = getAuthToken()
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  private isValidUrl(): boolean {
    if (this.baseUrl.startsWith('/')) return true
    try {
      new URL(this.baseUrl)
      return true
    } catch {
      return false
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isValidUrl()) {
      return false
    }

    try {
      const healthUrl = `${this.baseUrl}/health`
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async getAllSnippets(): Promise<Snippet[]> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/snippets`, { headers: this.authHeader() })
    if (!response.ok) {
      throw new Error(`Failed to fetch snippets: ${response.statusText}`)
    }
    const data: Snippet[] = await response.json()
    return data.map((s) => ({
      ...s,
      createdAt: typeof s.createdAt === 'string' ? new Date(s.createdAt).getTime() : s.createdAt,
      updatedAt: typeof s.updatedAt === 'string' ? new Date(s.updatedAt).getTime() : s.updatedAt
    }))
  }

  async getSnippet(id: string): Promise<Snippet | null> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/snippets/${id}`, { headers: this.authHeader() })
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch snippet: ${response.statusText}`)
    }
    const data = await response.json()
    return {
      ...data,
      createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt).getTime() : data.createdAt,
      updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt).getTime() : data.updatedAt
    }
  }

  async createSnippet(snippet: Snippet): Promise<Snippet> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/snippets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify({
        ...snippet,
        createdAt: new Date(snippet.createdAt).toISOString(),
        updatedAt: new Date(snippet.updatedAt).toISOString()
      })
    })
    if (!response.ok) {
      throw new Error(`Failed to create snippet: ${response.statusText}`)
    }
    return await response.json()
  }

  async updateSnippet(snippet: Snippet): Promise<void> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/snippets/${snippet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify({
        ...snippet,
        createdAt: new Date(snippet.createdAt).toISOString(),
        updatedAt: new Date(snippet.updatedAt).toISOString()
      })
    })
    if (!response.ok) {
      throw new Error(`Failed to update snippet: ${response.statusText}`)
    }
  }

  async deleteSnippet(id: string): Promise<void> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/snippets/${id}`, {
      method: 'DELETE',
      headers: this.authHeader(),
    })
    if (!response.ok) {
      throw new Error(`Failed to delete snippet: ${response.statusText}`)
    }
  }

  async migrateFromIndexedDB(snippets: Snippet[]): Promise<void> {
    for (const snippet of snippets) {
      await this.createSnippet(snippet)
    }
  }

  async migrateToIndexedDB(): Promise<Snippet[]> {
    return this.getAllSnippets()
  }

  async getAllNamespaces(): Promise<import('./types').Namespace[]> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/namespaces`, { headers: this.authHeader() })
    if (!response.ok) {
      throw new Error(`Failed to fetch namespaces: ${response.statusText}`)
    }
    return await response.json()
  }

  async createNamespace(namespace: import('./types').Namespace): Promise<import('./types').Namespace> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/namespaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify(namespace)
    })
    if (!response.ok) {
      throw new Error(`Failed to create namespace: ${response.statusText}`)
    }
    return await response.json()
  }

  async updateNamespace(id: string, name: string): Promise<import('./types').Namespace> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/namespaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify({ name }),
    })
    if (!response.ok) {
      throw new Error(`Failed to update namespace: ${response.statusText}`)
    }
    return await response.json()
  }

  async deleteNamespace(id: string): Promise<void> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/namespaces/${id}`, {
      method: 'DELETE',
      headers: this.authHeader(),
    })
    if (!response.ok) {
      throw new Error(`Failed to delete namespace: ${response.statusText}`)
    }
  }

  async wipeDatabase(): Promise<void> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/wipe`, {
      method: 'POST',
      headers: this.authHeader(),
    })
    if (!response.ok) {
      throw new Error(`Failed to wipe database: ${response.statusText}`)
    }
  }

  async bulkMoveSnippets(snippetIds: string[], targetNamespaceId: string): Promise<void> {
    if (!this.isValidUrl()) {
      throw new Error('Invalid Flask backend URL')
    }
    const response = await fetch(`${this.baseUrl}/api/snippets/bulk-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify({ snippetIds, targetNamespaceId })
    })
    if (!response.ok) {
      throw new Error(`Failed to bulk move snippets: ${response.statusText}`)
    }
  }

  async getSnippetsByNamespace(namespaceId: string): Promise<Snippet[]> {
    const snippets = await this.getAllSnippets();
    return snippets.filter(s => s.namespaceId === namespaceId);
  }

  async getNamespace(id: string): Promise<import('./types').Namespace | null> {
    const namespaces = await this.getAllNamespaces();
    return namespaces.find(ns => ns.id === id) || null;
  }

  async clearDatabase(): Promise<void> {
    return this.wipeDatabase();
  }

  async getStats() {
    const snippets = await this.getAllSnippets();
    const namespaces = await this.getAllNamespaces();
    const templates = snippets.filter(s => s.isTemplate);
    return {
      snippetCount: snippets.length,
      templateCount: templates.length,
      namespaceCount: namespaces.length,
      storageType: 'flask' as const,
      databaseSize: 0,
    };
  }

  async exportDatabase(): Promise<{ snippets: Snippet[]; namespaces: import('./types').Namespace[] }> {
    const snippets = await this.getAllSnippets();
    const namespaces = await this.getAllNamespaces();
    return { snippets, namespaces };
  }

  async importDatabase(data: { snippets: Snippet[]; namespaces: Namespace[] }): Promise<void> {
    await this.wipeDatabase();

    for (const namespace of data.namespaces) {
      await this.createNamespace(namespace);
    }

    for (const snippet of data.snippets) {
      await this.createSnippet(snippet);
    }
  }
}

// ---------------------------------------------------------------------------
// DBAL Direct Storage Adapter
// ---------------------------------------------------------------------------

const DBAL_TENANT = 'pastebin'
const DBAL_PACKAGE = 'pastebin'

export class DBALStorageAdapter {
  private baseUrl: string
  private flaskUrl: string | undefined

  constructor(dbalUrl: string, flaskUrl?: string) {
    this.baseUrl = dbalUrl.replace(/\/$/, '')
    this.flaskUrl = flaskUrl?.replace(/\/$/, '')
  }

  private authHeader(): Record<string, string> {
    const t = getAuthToken()
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  private entityUrl(entity: string): string {
    return `${this.baseUrl}/${DBAL_TENANT}/${DBAL_PACKAGE}/${entity}`
  }

  async testConnection(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(5000) })
      return r.ok
    } catch {
      return false
    }
  }

  // --- Snippets ---

  private toSnippet(raw: Record<string, unknown>): Snippet {
    return {
      id: raw.id as string,
      title: raw.title as string,
      description: (raw.description as string) ?? '',
      code: raw.code as string,
      language: raw.language as string,
      category: (raw.category as string) ?? '',
      namespaceId: raw.namespaceId as string | undefined,
      hasPreview: raw.hasPreview as boolean | undefined,
      isTemplate: raw.isTemplate as boolean | undefined,
      functionName: raw.functionName as string | undefined,
      inputParameters: typeof raw.inputParameters === 'string'
        ? JSON.parse(raw.inputParameters || '[]')
        : (raw.inputParameters as Snippet['inputParameters']),
      files: typeof raw.files === 'string'
        ? JSON.parse(raw.files || '[]')
        : (raw.files as Snippet['files']),
      entryPoint: raw.entryPoint as string | undefined,
      createdAt: Number(raw.createdAt) || 0,
      updatedAt: Number(raw.updatedAt) || Number(raw.createdAt) || 0,
      shareToken: raw.shareToken as string | undefined,
    }
  }

  async getAllSnippets(): Promise<Snippet[]> {
    const userId = this.getUserId()
    const url = `${this.entityUrl('Snippet')}?filter.userId=${userId}&sort.updatedAt=desc&limit=500`
    const r = await fetch(url, { headers: this.authHeader() })
    if (!r.ok) throw new Error(`Failed to fetch snippets: ${r.statusText}`)
    const json = await r.json()
    const items: Record<string, unknown>[] = json.data?.data ?? json.data ?? []
    return items.map(i => this.toSnippet(i))
  }

  async getSnippet(id: string): Promise<Snippet | null> {
    const r = await fetch(`${this.entityUrl('Snippet')}/${id}`, { headers: this.authHeader() })
    if (r.status === 404) return null
    if (!r.ok) throw new Error(`Failed to fetch snippet: ${r.statusText}`)
    const json = await r.json()
    const data = json.data ?? json
    return this.toSnippet(data)
  }

  async createSnippet(snippet: Snippet): Promise<Snippet> {
    const body = this.snippetToBody(snippet)
    const r = await fetch(this.entityUrl('Snippet'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`Failed to create snippet: ${r.statusText}`)
    const json = await r.json()
    return this.toSnippet(json.data ?? json)
  }

  async updateSnippet(snippet: Snippet): Promise<void> {
    const body = this.snippetToBody(snippet)
    const r = await fetch(`${this.entityUrl('Snippet')}/${snippet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`Failed to update snippet: ${r.statusText}`)
  }

  async deleteSnippet(id: string): Promise<void> {
    const r = await fetch(`${this.entityUrl('Snippet')}/${id}`, {
      method: 'DELETE',
      headers: this.authHeader(),
    })
    if (!r.ok) throw new Error(`Failed to delete snippet: ${r.statusText}`)
  }

  async getSnippetsByNamespace(namespaceId: string): Promise<Snippet[]> {
    const userId = this.getUserId()
    const url = `${this.entityUrl('Snippet')}?filter.userId=${userId}&filter.namespaceId=${namespaceId}&sort.updatedAt=desc&limit=500`
    const r = await fetch(url, { headers: this.authHeader() })
    if (!r.ok) throw new Error(`Failed to fetch snippets: ${r.statusText}`)
    const json = await r.json()
    const items: Record<string, unknown>[] = json.data?.data ?? json.data ?? []
    return items.map(i => this.toSnippet(i))
  }

  async bulkMoveSnippets(snippetIds: string[], targetNamespaceId: string): Promise<void> {
    for (const id of snippetIds) {
      await fetch(`${this.entityUrl('Snippet')}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeader() },
        body: JSON.stringify({ namespaceId: targetNamespaceId, updatedAt: Date.now() }),
      })
    }
  }

  // --- Namespaces ---

  private toNamespace(raw: Record<string, unknown>): Namespace {
    return {
      id: raw.id as string,
      name: raw.name as string,
      createdAt: Number(raw.createdAt) || 0,
      isDefault: !!raw.isDefault,
      userId: raw.userId as string | undefined,
      tenantId: raw.tenantId as string | undefined,
    }
  }

  async getAllNamespaces(): Promise<Namespace[]> {
    const userId = this.getUserId()
    const url = `${this.entityUrl('Namespace')}?filter.userId=${userId}&sort.isDefault=desc&sort.name=asc&limit=500`
    const r = await fetch(url, { headers: this.authHeader() })
    if (!r.ok) throw new Error(`Failed to fetch namespaces: ${r.statusText}`)
    const json = await r.json()
    const items: Record<string, unknown>[] = json.data?.data ?? json.data ?? []
    return items.map(i => this.toNamespace(i))
  }

  async getNamespace(id: string): Promise<Namespace | null> {
    const namespaces = await this.getAllNamespaces()
    return namespaces.find(ns => ns.id === id) || null
  }

  async createNamespace(namespace: Namespace): Promise<Namespace> {
    const userId = this.getUserId()
    const body = {
      name: namespace.name,
      isDefault: namespace.isDefault,
      userId,
      tenantId: DBAL_TENANT,
      createdAt: namespace.createdAt || Date.now(),
    }
    const r = await fetch(this.entityUrl('Namespace'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`Failed to create namespace: ${r.statusText}`)
    const json = await r.json()
    return this.toNamespace(json.data ?? json)
  }

  async updateNamespace(id: string, name: string): Promise<Namespace> {
    const r = await fetch(`${this.entityUrl('Namespace')}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify({ name }),
    })
    if (!r.ok) throw new Error(`Failed to update namespace: ${r.statusText}`)
    const json = await r.json()
    return this.toNamespace(json.data ?? json)
  }

  async deleteNamespace(id: string): Promise<void> {
    const r = await fetch(`${this.entityUrl('Namespace')}/${id}`, {
      method: 'DELETE',
      headers: this.authHeader(),
    })
    if (!r.ok) throw new Error(`Failed to delete namespace: ${r.statusText}`)
  }

  // --- Database ops ---

  async clearDatabase(): Promise<void> {
    // Not supported via DBAL — would need bulk delete
  }

  async getStats() {
    const snippets = await this.getAllSnippets()
    const namespaces = await this.getAllNamespaces()
    return {
      snippetCount: snippets.length,
      templateCount: snippets.filter(s => s.isTemplate).length,
      namespaceCount: namespaces.length,
      storageType: 'dbal' as const,
      databaseSize: 0,
    }
  }

  async exportDatabase(): Promise<{ snippets: Snippet[]; namespaces: Namespace[] }> {
    return {
      snippets: await this.getAllSnippets(),
      namespaces: await this.getAllNamespaces(),
    }
  }

  async importDatabase(data: { snippets: Snippet[]; namespaces: Namespace[] }): Promise<void> {
    for (const ns of data.namespaces) await this.createNamespace(ns)
    for (const s of data.snippets) await this.createSnippet(s)
  }

  // --- Helpers ---

  private getUserId(): string {
    const token = getAuthToken()
    if (!token) return ''
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.sub ?? ''
    } catch {
      return ''
    }
  }

  private snippetToBody(snippet: Snippet): Record<string, unknown> {
    const userId = this.getUserId()
    return {
      title: snippet.title,
      description: snippet.description || '',
      code: snippet.code,
      language: snippet.language,
      category: snippet.category || 'general',
      namespaceId: snippet.namespaceId,
      hasPreview: snippet.hasPreview ?? false,
      isTemplate: snippet.isTemplate ?? false,
      functionName: snippet.functionName ?? null,
      inputParameters: snippet.inputParameters ? JSON.stringify(snippet.inputParameters) : '[]',
      files: snippet.files ? JSON.stringify(snippet.files) : null,
      entryPoint: snippet.entryPoint ?? null,
      updatedAt: snippet.updatedAt || Date.now(),
      userId,
      tenantId: DBAL_TENANT,
      shareToken: snippet.shareToken ?? null,
    }
  }
}
