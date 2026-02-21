'use client'

/**
 * @file useDBALEntity.ts
 * @description Hook for entity CRUD operations via the C++ DBAL REST API.
 *
 * Replaces the TypeScript DBALClient entity proxy pattern:
 *   const client = getDBALClient()
 *   client.user.list({ filter: { status: 'active' } })
 *
 * With a React hook pattern:
 *   const users = useDBALEntity<User>('user', { tenant: 'acme', packageId: 'core' })
 *   const result = await users.list({ filter: { status: 'active' } })
 *
 * REST endpoint: /api/v1/{tenant}/{package}/{entity}[/{id}[/{action}]]
 *
 * When `offline: true`, CRUD operations fall back to IndexedDB on network
 * errors and queue mutations for sync when connectivity returns.
 */

import { useState, useCallback, useRef } from 'react'
import { useDBALClient, isNetworkError } from './useDBALClient'
import { OfflineStore } from './useIndexedDB'
import { SyncQueue } from './useSyncQueue'
import type {
  DBALClientConfig,
  ListOptions,
  ListResult,
  BulkCreateResult,
  BulkUpdateResult,
  BulkDeleteResult,
} from './types'

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export interface UseDBALEntityOptions extends DBALClientConfig {
  /**
   * Automatically clear error state before each new request.
   * Default: true
   */
  clearErrorOnRequest?: boolean

  /**
   * Enable offline fallback via IndexedDB.
   * When true, CRUD operations fall back to local IndexedDB on network errors
   * and queue mutations for sync when connectivity returns.
   * Default: false
   */
  offline?: boolean
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseDBALEntityReturn<T> {
  /** Whether a request is in flight */
  loading: boolean
  /** Last error from a failed request */
  error: Error | null

  // -- Standard CRUD --

  /** List entities with optional filtering, sorting, pagination */
  list: (options?: ListOptions, signal?: AbortSignal) => Promise<ListResult<T>>

  /** Read a single entity by ID */
  read: (id: string, signal?: AbortSignal) => Promise<T | null>

  /** Create a new entity */
  create: (data: Record<string, unknown>, signal?: AbortSignal) => Promise<T>

  /** Update an entity by ID */
  update: (id: string, data: Record<string, unknown>, signal?: AbortSignal) => Promise<T>

  /** Delete an entity by ID */
  remove: (id: string, signal?: AbortSignal) => Promise<boolean>

  // -- Find operations --

  /** Find first entity matching a filter */
  findFirst: (filter: Record<string, unknown>, signal?: AbortSignal) => Promise<T | null>

  /** Find entity by a specific field value */
  findByField: (field: string, value: unknown, signal?: AbortSignal) => Promise<T | null>

  // -- Upsert --

  /** Upsert: create if not exists, update if exists */
  upsert: (
    uniqueField: string,
    uniqueValue: unknown,
    createData: Record<string, unknown>,
    updateData: Record<string, unknown>,
    signal?: AbortSignal
  ) => Promise<T>

  // -- Bulk operations --

  /** Create multiple entities at once */
  createMany: (records: Record<string, unknown>[], signal?: AbortSignal) => Promise<BulkCreateResult>

  /** Update multiple entities matching a filter */
  updateMany: (
    filter: Record<string, unknown>,
    data: Record<string, unknown>,
    signal?: AbortSignal
  ) => Promise<BulkUpdateResult>

  /** Delete multiple entities matching a filter */
  deleteMany: (filter: Record<string, unknown>, signal?: AbortSignal) => Promise<BulkDeleteResult>

  // -- Custom actions --

  /** Invoke a custom action on an entity */
  action: (
    id: string,
    actionName: string,
    data?: Record<string, unknown>,
    signal?: AbortSignal
  ) => Promise<T>

  /** Clear the current error state */
  clearError: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a local UUID for offline-created records */
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Strip OfflineStore metadata fields from a record to produce a clean entity.
 */
function stripOfflineMeta<T>(record: Record<string, unknown>): T {
  const { _entity, _syncStatus, _localUpdatedAt, ...rest } = record
  return rest as unknown as T
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * Hook for CRUD operations on a specific entity via the C++ DBAL REST API.
 *
 * @template T - The entity type
 * @param entity - Entity name (e.g. 'user', 'workflow', 'package')
 * @param options - DBAL client config (tenant, packageId, baseUrl, etc.)
 *
 * @example
 * // Basic usage
 * const users = useDBALEntity<User>('user', { tenant: 'acme', packageId: 'core' })
 *
 * // List with filtering
 * const { data, total } = await users.list({ filter: { status: 'active' }, limit: 10 })
 *
 * // CRUD
 * const user = await users.read('user-123')
 * const created = await users.create({ name: 'Alice', email: 'alice@example.com' })
 * const updated = await users.update('user-123', { name: 'Bob' })
 * await users.remove('user-123')
 *
 * // Offline-enabled CRUD (falls back to IndexedDB)
 * const offlineUsers = useDBALEntity<User>('user', {
 *   tenant: 'acme', packageId: 'core', offline: true
 * })
 *
 * // Bulk
 * await users.createMany([{ name: 'A' }, { name: 'B' }])
 * await users.updateMany({ status: 'inactive' }, { status: 'archived' })
 * await users.deleteMany({ status: 'archived' })
 */
export function useDBALEntity<T = unknown>(
  entity: string,
  options?: UseDBALEntityOptions
): UseDBALEntityReturn<T> {
  const { clearErrorOnRequest = true, offline = false, ...clientConfig } = options ?? {}
  const { request, buildUrl } = useDBALClient(clientConfig)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const isMountedRef = useRef(true)
  const offlineRef = useRef(offline)
  offlineRef.current = offline

  // Cleanup on unmount handled at component level

  /**
   * Wrapper that manages loading/error state around an async operation
   */
  const withState = useCallback(
    async <R,>(fn: () => Promise<R>): Promise<R> => {
      if (clearErrorOnRequest) setError(null)
      setLoading(true)

      try {
        const result = await fn()
        return result
      } catch (err) {
        const wrappedError = err instanceof Error ? err : new Error(String(err))
        // Don't set error for abort
        if (wrappedError.name !== 'AbortError') {
          setError(wrappedError)
        }
        throw wrappedError
      } finally {
        setLoading(false)
      }
    },
    [clearErrorOnRequest]
  )

  // -- Offline helpers ------------------------------------------------------

  const getOfflineStore = useCallback((): OfflineStore => {
    return OfflineStore.getInstance()
  }, [])

  const getSyncQueue = useCallback((): SyncQueue => {
    return SyncQueue.getInstance()
  }, [])

  /**
   * Cache a list of records from a successful REST response into IndexedDB.
   */
  const cacheRecords = useCallback(
    async (records: Array<Record<string, unknown>>): Promise<void> => {
      if (!offlineRef.current) return
      const store = getOfflineStore()
      await store.putMany(
        entity,
        records.map((r) => ({
          ...r,
          id: r.id as string,
          _syncStatus: 'synced' as const,
        }))
      )
    },
    [entity, getOfflineStore]
  )

  /**
   * Cache a single record from a successful REST response into IndexedDB.
   */
  const cacheRecord = useCallback(
    async (record: Record<string, unknown>): Promise<void> => {
      if (!offlineRef.current) return
      const store = getOfflineStore()
      await store.put(entity, {
        ...record,
        id: record.id as string,
        _syncStatus: 'synced',
      })
    },
    [entity, getOfflineStore]
  )

  // -- CRUD operations -------------------------------------------------------

  const list = useCallback(
    async (opts?: ListOptions, signal?: AbortSignal): Promise<ListResult<T>> => {
      return withState(async () => {
        const url = buildUrl(entity)
        const query: Record<string, unknown> = {}

        if (opts?.filter) query.filter = opts.filter
        if (opts?.sort) query.sort = opts.sort
        if (opts?.page !== undefined) query.page = opts.page
        if (opts?.limit !== undefined) query.limit = opts.limit

        try {
          const result = await request<ListResult<T>>('GET', url, { query, signal })

          // Cache successful response in IndexedDB for offline access
          if (offlineRef.current && result.data) {
            await cacheRecords(result.data as unknown as Array<Record<string, unknown>>)
          }

          return result
        } catch (err) {
          // Fallback to IndexedDB on network error when offline mode is enabled
          if (offlineRef.current && isNetworkError(err)) {
            const store = getOfflineStore()
            const records = await store.getAll(entity)
            // Filter out pending-delete records
            const active = records.filter((r) => r._syncStatus !== 'pending-delete')
            const cleaned = active.map((r) => stripOfflineMeta<T>(r))

            return {
              data: cleaned,
              total: cleaned.length,
              page: opts?.page ?? 1,
              limit: opts?.limit ?? cleaned.length,
              hasMore: false,
            }
          }
          throw err
        }
      })
    },
    [entity, buildUrl, request, withState, cacheRecords, getOfflineStore]
  )

  const read = useCallback(
    async (id: string, signal?: AbortSignal): Promise<T | null> => {
      return withState(async () => {
        const url = buildUrl(entity, id)

        try {
          const result = await request<T | null>('GET', url, { signal })

          // Cache successful response
          if (offlineRef.current && result) {
            await cacheRecord(result as unknown as Record<string, unknown>)
          }

          return result
        } catch (err) {
          if (offlineRef.current && isNetworkError(err)) {
            const store = getOfflineStore()
            const record = await store.get(entity, id)
            if (record && record._syncStatus !== 'pending-delete') {
              return stripOfflineMeta<T>(record)
            }
            return null
          }
          throw err
        }
      })
    },
    [entity, buildUrl, request, withState, cacheRecord, getOfflineStore]
  )

  const create = useCallback(
    async (data: Record<string, unknown>, signal?: AbortSignal): Promise<T> => {
      return withState(async () => {
        const url = buildUrl(entity)

        try {
          const result = await request<T>('POST', url, { body: data, signal })

          // Cache the server-created record
          if (offlineRef.current && result) {
            await cacheRecord(result as unknown as Record<string, unknown>)
          }

          return result
        } catch (err) {
          if (offlineRef.current && isNetworkError(err)) {
            const localId = (data.id as string) ?? generateLocalId()
            const localRecord = { ...data, id: localId }

            // Write to IndexedDB with pending-create status
            const store = getOfflineStore()
            await store.put(entity, {
              ...localRecord,
              id: localId,
              _syncStatus: 'pending-create',
            })

            // Enqueue for sync
            const queue = getSyncQueue()
            await queue.enqueue({
              entity,
              operation: 'create',
              data: localRecord,
            })

            return localRecord as unknown as T
          }
          throw err
        }
      })
    },
    [entity, buildUrl, request, withState, cacheRecord, getOfflineStore, getSyncQueue]
  )

  const update = useCallback(
    async (id: string, data: Record<string, unknown>, signal?: AbortSignal): Promise<T> => {
      return withState(async () => {
        const url = buildUrl(entity, id)

        try {
          const result = await request<T>('PUT', url, { body: data, signal })

          // Cache the server-updated record
          if (offlineRef.current && result) {
            await cacheRecord(result as unknown as Record<string, unknown>)
          }

          return result
        } catch (err) {
          if (offlineRef.current && isNetworkError(err)) {
            const store = getOfflineStore()

            // Merge with existing local record if present
            const existing = await store.get(entity, id)
            const merged = { ...(existing ?? {}), ...data, id }

            await store.put(entity, {
              ...merged,
              id,
              _syncStatus: 'pending-update',
            })

            // Enqueue for sync
            const queue = getSyncQueue()
            await queue.enqueue({
              entity,
              operation: 'update',
              data: { ...data, id },
            })

            return stripOfflineMeta<T>(merged)
          }
          throw err
        }
      })
    },
    [entity, buildUrl, request, withState, cacheRecord, getOfflineStore, getSyncQueue]
  )

  const remove = useCallback(
    async (id: string, signal?: AbortSignal): Promise<boolean> => {
      return withState(async () => {
        const url = buildUrl(entity, id)

        try {
          const result = await request<boolean>('DELETE', url, { signal })

          // Remove from IndexedDB cache on successful delete
          if (offlineRef.current) {
            const store = getOfflineStore()
            await store.delete(entity, id)
          }

          return result
        } catch (err) {
          if (offlineRef.current && isNetworkError(err)) {
            const store = getOfflineStore()

            // Mark as pending-delete in IndexedDB (don't physically remove yet)
            const existing = await store.get(entity, id)
            if (existing) {
              await store.put(entity, {
                ...existing,
                id,
                _syncStatus: 'pending-delete',
              })
            }

            // Enqueue for sync
            const queue = getSyncQueue()
            await queue.enqueue({
              entity,
              operation: 'delete',
              data: { id },
            })

            return true
          }
          throw err
        }
      })
    },
    [entity, buildUrl, request, withState, getOfflineStore, getSyncQueue]
  )

  // -- Find operations -------------------------------------------------------

  const findFirst = useCallback(
    async (filter: Record<string, unknown>, signal?: AbortSignal): Promise<T | null> => {
      return withState(async () => {
        const url = buildUrl(entity, undefined, 'find-first')
        return request<T | null>('POST', url, { body: { filter }, signal })
      })
    },
    [entity, buildUrl, request, withState]
  )

  const findByField = useCallback(
    async (field: string, value: unknown, signal?: AbortSignal): Promise<T | null> => {
      return withState(async () => {
        const url = buildUrl(entity, undefined, 'find-by-field')
        return request<T | null>('POST', url, { body: { field, value }, signal })
      })
    },
    [entity, buildUrl, request, withState]
  )

  // -- Upsert ----------------------------------------------------------------

  const upsert = useCallback(
    async (
      uniqueField: string,
      uniqueValue: unknown,
      createData: Record<string, unknown>,
      updateData: Record<string, unknown>,
      signal?: AbortSignal
    ): Promise<T> => {
      return withState(async () => {
        const url = buildUrl(entity, undefined, 'upsert')
        return request<T>('POST', url, {
          body: { uniqueField, uniqueValue, createData, updateData },
          signal,
        })
      })
    },
    [entity, buildUrl, request, withState]
  )

  // -- Bulk operations -------------------------------------------------------

  const createMany = useCallback(
    async (records: Record<string, unknown>[], signal?: AbortSignal): Promise<BulkCreateResult> => {
      return withState(async () => {
        const url = buildUrl(entity, undefined, 'bulk-create')
        return request<BulkCreateResult>('POST', url, { body: { records }, signal })
      })
    },
    [entity, buildUrl, request, withState]
  )

  const updateMany = useCallback(
    async (
      filter: Record<string, unknown>,
      data: Record<string, unknown>,
      signal?: AbortSignal
    ): Promise<BulkUpdateResult> => {
      return withState(async () => {
        const url = buildUrl(entity, undefined, 'bulk-update')
        return request<BulkUpdateResult>('POST', url, { body: { filter, data }, signal })
      })
    },
    [entity, buildUrl, request, withState]
  )

  const deleteMany = useCallback(
    async (filter: Record<string, unknown>, signal?: AbortSignal): Promise<BulkDeleteResult> => {
      return withState(async () => {
        const url = buildUrl(entity, undefined, 'bulk-delete')
        return request<BulkDeleteResult>('POST', url, { body: { filter }, signal })
      })
    },
    [entity, buildUrl, request, withState]
  )

  // -- Custom actions --------------------------------------------------------

  const actionFn = useCallback(
    async (
      id: string,
      actionName: string,
      data?: Record<string, unknown>,
      signal?: AbortSignal
    ): Promise<T> => {
      return withState(async () => {
        const url = buildUrl(entity, id, actionName)
        return request<T>('POST', url, {
          body: data,
          signal,
        })
      })
    },
    [entity, buildUrl, request, withState]
  )

  // -- Utility ---------------------------------------------------------------

  const clearError = useCallback(() => setError(null), [])

  return {
    loading,
    error,
    list,
    read,
    create,
    update,
    remove,
    findFirst,
    findByField,
    upsert,
    createMany,
    updateMany,
    deleteMany,
    action: actionFn,
    clearError,
  }
}
