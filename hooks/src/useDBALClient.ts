'use client'

/**
 * @file useDBALClient.ts
 * @description Low-level hook for making requests to the C++ DBAL REST API.
 *
 * Provides the fetch-based transport layer used by all higher-level DBAL hooks.
 * Handles URL construction, error mapping, abort signals, and response parsing.
 *
 * REST endpoint pattern: /api/v1/{tenant}/{package}/{entity}[/{id}[/{action}]]
 */

import { useCallback, useRef, useMemo } from 'react'
import type { ApiResponse, DBALClientConfig } from './types'
import { DBALError, DBALErrorCode } from './types'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30_000

// ---------------------------------------------------------------------------
// Network error detection
// ---------------------------------------------------------------------------

/**
 * Determine whether an error represents a network-level failure
 * (offline, DNS failure, connection refused, etc.) as opposed to
 * an HTTP-level error from the server.
 */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false

  // fetch() throws TypeError on network failure in all modern browsers
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network request failed') ||
      msg.includes('networkerror') ||
      msg.includes('load failed') ||       // Safari
      msg.includes('network error')
    )
  }

  return false
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Nested objects: flatten as dot-notation (e.g. filter.status=active)
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        if (subValue !== undefined && subValue !== null) {
          searchParams.set(`${key}.${subKey}`, String(subValue))
        }
      }
    } else {
      searchParams.set(key, String(value))
    }
  }

  const qs = searchParams.toString()
  return qs.length > 0 ? `?${qs}` : ''
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return (await response.json()) as ApiResponse<T>
  }

  // Non-JSON response: wrap text in an error envelope
  const text = await response.text()
  return {
    success: false,
    error: text || `HTTP ${response.status}: ${response.statusText}`,
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseDBALClientReturn {
  /**
   * Make a request to the DBAL REST API.
   * Throws DBALError on failure.
   */
  request: <T = unknown>(
    method: string,
    path: string,
    options?: {
      body?: unknown
      query?: Record<string, unknown>
      signal?: AbortSignal
      headers?: Record<string, string>
    }
  ) => Promise<T>

  /**
   * Build a full URL for a DBAL API path.
   */
  buildUrl: (
    entity: string,
    id?: string,
    action?: string,
    overrides?: { tenant?: string; packageId?: string }
  ) => string
}

/**
 * Low-level hook for the C++ DBAL REST API transport layer.
 *
 * Higher-level hooks (useDBALEntity, useBlobStorage, useKVStore) are built on top
 * of this. Use this hook directly only when you need custom request patterns.
 *
 * @example
 * const { request, buildUrl } = useDBALClient({ tenant: 'acme', packageId: 'crm' })
 * const users = await request<User[]>('GET', buildUrl('user'))
 */
export function useDBALClient(config: DBALClientConfig = {}): UseDBALClientReturn {
  const configRef = useRef(config)
  configRef.current = config

  const buildUrl = useCallback(
    (
      entity: string,
      id?: string,
      action?: string,
      overrides?: { tenant?: string; packageId?: string }
    ): string => {
      const cfg = configRef.current
      const tenant = overrides?.tenant ?? cfg.tenant
      const pkg = overrides?.packageId ?? cfg.packageId
      const base = cfg.baseUrl ?? ''

      if (!tenant) {
        throw new DBALError(DBALErrorCode.VALIDATION_ERROR, 'Tenant is required for DBAL API calls')
      }
      if (!pkg) {
        throw new DBALError(DBALErrorCode.VALIDATION_ERROR, 'Package is required for DBAL API calls')
      }

      let url = `${base}/api/v1/${tenant}/${pkg}/${entity}`
      if (id) url += `/${id}`
      if (action) url += `/${action}`
      return url
    },
    []
  )

  const request = useCallback(
    async <T = unknown>(
      method: string,
      path: string,
      options?: {
        body?: unknown
        query?: Record<string, unknown>
        signal?: AbortSignal
        headers?: Record<string, string>
      }
    ): Promise<T> => {
      const cfg = configRef.current
      const timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS

      // Build final URL with query params
      const queryString = options?.query ? buildQueryString(options.query) : ''
      const url = `${path}${queryString}`

      // Merge headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...cfg.headers,
        ...options?.headers,
      }

      // Setup abort controller with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      // Chain external signal if provided
      if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true })
      }

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        })

        const parsed = await parseResponse<T>(response)

        if (!response.ok || !parsed.success) {
          throw DBALError.fromResponse(
            response.status,
            parsed.error ?? `HTTP ${response.status}: ${response.statusText}`
          )
        }

        return parsed.data as T
      } catch (err) {
        // Re-throw abort errors as-is
        if (err instanceof Error && err.name === 'AbortError') {
          cfg.onRequestError?.('timeout')
          throw err
        }

        // Notify consumer of network-level failures (offline, DNS, etc.)
        if (isNetworkError(err)) {
          cfg.onRequestError?.('offline')
        }

        // Re-throw DBALErrors as-is
        if (err instanceof DBALError) {
          throw err
        }
        // Wrap unexpected errors
        const wrappedError = new DBALError(
          DBALErrorCode.INTERNAL_ERROR,
          err instanceof Error ? err.message : 'Unknown error'
        )
        if (!isNetworkError(err)) {
          cfg.onRequestError?.('unknown')
        }
        throw wrappedError
      } finally {
        clearTimeout(timeoutId)
      }
    },
    [buildUrl]
  )

  return useMemo(() => ({ request, buildUrl }), [request, buildUrl])
}
