/**
 * useDBAL - Generic DBAL API client hook
 *
 * Provides a simple, reusable interface for making requests to any DBAL endpoint.
 * Works across all frontends without service-specific dependencies.
 */

import { useState, useCallback, useMemo } from 'react'

export interface DBALError {
  message: string
  code?: string
}

export interface DBALResponse<T> {
  data?: T
  error?: DBALError
}

export interface UseDBALOptions {
  /**
   * Base URL for DBAL API requests
   * @default '/api/dbal'
   */
  baseUrl?: string

  /**
   * Tenant identifier
   * @default 'default'
   */
  tenant?: string

  /**
   * Package name
   * @default 'core'
   */
  package?: string
}

export interface UseDBALResult {
  /**
   * Whether a request is currently loading
   */
  loading: boolean

  /**
   * Error from the last request, if any
   */
  error: DBALError | null

  /**
   * Execute a GET request
   */
  get: <T = unknown>(entity: string, id: string) => Promise<T | null>

  /**
   * Execute a GET request to list entities with optional parameters
   */
  list: <T = unknown>(entity: string, params?: Record<string, unknown>) => Promise<T | null>

  /**
   * Execute a POST request to create an entity
   */
  create: <T = unknown>(entity: string, data: unknown) => Promise<T | null>

  /**
   * Execute a PUT request to update an entity
   */
  update: <T = unknown>(entity: string, id: string, data: unknown) => Promise<T | null>

  /**
   * Execute a DELETE request
   */
  delete: <T = unknown>(entity: string, id: string) => Promise<T | null>

  /**
   * Execute a custom request to any endpoint
   */
  request: <T = unknown>(method: string, endpoint: string, body?: unknown) => Promise<T | null>
}

/**
 * useDBAL hook - Manage DBAL API requests
 *
 * @param options Configuration options (baseUrl, etc.)
 * @returns DBAL client with request methods
 *
 * @example
 * ```tsx
 * const dbal = useDBAL()
 * const user = await dbal.get('users', 'user-123')
 * const users = await dbal.list('users', { filter: { active: true } })
 * await dbal.create('users', { name: 'John' })
 * await dbal.update('users', 'user-123', { name: 'Jane' })
 * await dbal.delete('users', 'user-123')
 * ```
 */
export function useDBAL(options: UseDBALOptions = {}): UseDBALResult {
  const { baseUrl = '/api/dbal', tenant = 'default', package: pkg = 'core' } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<DBALError | null>(null)

  const request = useCallback(
    async <T,>(method: string, endpoint: string, body?: unknown): Promise<T | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${baseUrl}/${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        })

        const result = await response.json()

        // Handle C++ DBAL daemon response envelope
        if (!response.ok || !result.success) {
          const err = result.error || { message: result.message || 'Request failed' }
          setError(err)
          throw new Error(err.message)
        }

        // Extract data from envelope
        return result.data ?? null
      } catch (err) {
        const error = err instanceof Error ? { message: err.message } : { message: 'Unknown error' }
        setError(error)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [baseUrl]
  )

  const get = useCallback(
    async <T,>(entity: string, id: string) => request<T>('GET', `${tenant}/${pkg}/${entity}/${id}`),
    [request, tenant, pkg]
  )

  const list = useCallback(
    async <T,>(entity: string, params?: Record<string, unknown>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
      return request<T>('GET', `${tenant}/${pkg}/${entity}${queryString}`)
    },
    [request, tenant, pkg]
  )

  const create = useCallback(
    async <T,>(entity: string, data: unknown) => request<T>('POST', `${tenant}/${pkg}/${entity}`, data),
    [request, tenant, pkg]
  )

  const update = useCallback(
    async <T,>(entity: string, id: string, data: unknown) => request<T>('PUT', `${tenant}/${pkg}/${entity}/${id}`, data),
    [request, tenant, pkg]
  )

  const del = useCallback(
    async <T,>(entity: string, id: string) => request<T>('DELETE', `${tenant}/${pkg}/${entity}/${id}`),
    [request, tenant, pkg]
  )

  return useMemo(() => ({
    loading,
    error,
    get,
    list,
    create,
    update,
    delete: del,
    request,
  }), [loading, error, get, list, create, update, del, request])
}
