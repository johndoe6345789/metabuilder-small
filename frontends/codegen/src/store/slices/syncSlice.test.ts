import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockFetchAllFromFlask,
} = vi.hoisted(() => {
  return {
    mockFetchAllFromFlask: vi.fn<[], Promise<Record<string, any>>>(),
  }
})

vi.mock('@/store/middleware/flaskSync', () => ({
  fetchAllFromFlask: mockFetchAllFromFlask
}))

import { syncFromFlaskBulk } from './syncSlice'

describe('syncFromFlaskBulk', () => {
  const dispatch = vi.fn()
  const getState = vi.fn()

  beforeEach(() => {
    mockFetchAllFromFlask.mockReset()
    dispatch.mockReset()
    getState.mockReset()
  })

  it('ignores invalid keys from Flask', async () => {
    mockFetchAllFromFlask.mockResolvedValue({
      'unknown:1': { id: '1' },
      'files': { id: 'missing-colon' },
      'models:': { id: 'empty-id' },
      'components:abc:extra': { id: 'abc' }
    })

    const action = await syncFromFlaskBulk()(dispatch, getState, undefined)

    expect(action.type).toBe('sync/syncFromFlaskBulk/fulfilled')
    const payload = action.payload as any
    expect(payload.data.files).toHaveLength(0)
    expect(payload.data.models).toHaveLength(0)
    expect(payload.data.components).toHaveLength(0)
    expect(payload.data.workflows).toHaveLength(0)
  })

  it('organizes valid keys into data arrays', async () => {
    const file = { id: 'file-1', name: 'File 1' }
    const model = { id: 'model-1', name: 'Model 1' }

    mockFetchAllFromFlask.mockResolvedValue({
      'files:file-1': file,
      'models:model-1': model
    })

    const action = await syncFromFlaskBulk()(dispatch, getState, undefined)

    expect(action.type).toBe('sync/syncFromFlaskBulk/fulfilled')
    const payload = action.payload as any
    expect(payload.data.files).toEqual([file])
    expect(payload.data.models).toEqual([model])
    expect(payload.data.components).toHaveLength(0)
    expect(payload.data.workflows).toHaveLength(0)
    expect(payload.timestamp).toBeGreaterThan(0)
  })

  it('returns all items for a store (server is source of truth)', async () => {
    const file1 = { id: 'keep', name: 'Keep' }
    const file2 = { id: 'new', name: 'New' }

    mockFetchAllFromFlask.mockResolvedValue({
      'files:keep': file1,
      'files:new': file2,
    })

    const action = await syncFromFlaskBulk()(dispatch, getState, undefined)

    expect(action.type).toBe('sync/syncFromFlaskBulk/fulfilled')
    const payload = action.payload as any
    expect(payload.data.files).toHaveLength(2)
    expect(payload.data.files).toContainEqual(file1)
    expect(payload.data.files).toContainEqual(file2)
  })
})
