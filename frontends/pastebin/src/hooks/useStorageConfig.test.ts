import { renderHook, act } from '@testing-library/react'
import { useStorageConfig } from './useStorageConfig'
import * as storageModule from '@/lib/storage'

// Mock the storage module
jest.mock('@/lib/storage')

// Mock useTranslation to avoid Redux dependency
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    settings: { storage: { backendUpdated: 'Storage backend updated successfully' } },
  }),
}))

// Mock process.env
const originalEnv = process.env

const mockStorage = storageModule as jest.Mocked<typeof storageModule>

describe('useStorageConfig Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete (process.env as any).NEXT_PUBLIC_DBAL_API_URL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      mockStorage.loadStorageConfig.mockReturnValueOnce({
        backend: 'indexeddb',
      })

      const { result } = renderHook(() => useStorageConfig())

      expect(result.current.storageBackend).toBe('indexeddb')
      expect(result.current.envVarSet).toBe(false)
    })
  })

  describe('setStorageBackend', () => {
    it('should update storage backend state', () => {
      mockStorage.loadStorageConfig.mockReturnValueOnce({
        backend: 'indexeddb',
      })

      const { result } = renderHook(() => useStorageConfig())

      act(() => {
        result.current.setStorageBackend('dbal')
      })

      expect(result.current.storageBackend).toBe('dbal')
    })

    it('should support toggling between backends', () => {
      mockStorage.loadStorageConfig.mockReturnValueOnce({
        backend: 'indexeddb',
      })

      const { result } = renderHook(() => useStorageConfig())

      act(() => {
        result.current.setStorageBackend('dbal')
      })
      expect(result.current.storageBackend).toBe('dbal')

      act(() => {
        result.current.setStorageBackend('indexeddb')
      })
      expect(result.current.storageBackend).toBe('indexeddb')
    })
  })

  describe('loadConfig', () => {
    it('should load config from storage and update state', () => {
      mockStorage.loadStorageConfig.mockReturnValue({
        backend: 'indexeddb',
      })

      const { result } = renderHook(() => useStorageConfig())

      act(() => {
        result.current.loadConfig()
      })

      expect(result.current.storageBackend).toBe('indexeddb')
    })

    it('should set envVarSet when NEXT_PUBLIC_DBAL_API_URL is set', () => {
      process.env.NEXT_PUBLIC_DBAL_API_URL = 'http://localhost:8080'

      mockStorage.loadStorageConfig.mockReturnValue({
        backend: 'dbal',
        dbalUrl: 'http://localhost:8080',
      })

      const { result } = renderHook(() => useStorageConfig())

      act(() => {
        result.current.loadConfig()
      })

      expect(result.current.envVarSet).toBe(true)
    })

    it('should not set envVarSet when no env var is configured', () => {
      mockStorage.loadStorageConfig.mockReturnValue({
        backend: 'indexeddb',
      })

      const { result } = renderHook(() => useStorageConfig())

      act(() => {
        result.current.loadConfig()
      })

      expect(result.current.envVarSet).toBe(false)
    })
  })

  describe('handleSaveStorageConfig', () => {
    it('should save indexeddb config', async () => {
      mockStorage.loadStorageConfig.mockReturnValueOnce({
        backend: 'indexeddb',
      })

      const { result } = renderHook(() => useStorageConfig())

      act(() => {
        result.current.setStorageBackend('indexeddb')
      })

      await act(async () => {
        await result.current.handleSaveStorageConfig()
      })

      expect(mockStorage.saveStorageConfig).toHaveBeenCalledWith({
        backend: 'indexeddb',
      })
      // verify save was called (toast is tested separately)
      expect(mockStorage.saveStorageConfig).toHaveBeenCalled()
    })

    it('should call onSuccess callback after saving', async () => {
      mockStorage.loadStorageConfig.mockReturnValueOnce({
        backend: 'indexeddb',
      })

      const { result } = renderHook(() => useStorageConfig())
      const onSuccess = jest.fn().mockResolvedValueOnce(undefined)

      act(() => {
        result.current.setStorageBackend('indexeddb')
      })

      await act(async () => {
        await result.current.handleSaveStorageConfig(onSuccess)
      })

      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('should save dbal config', async () => {
      mockStorage.loadStorageConfig.mockReturnValueOnce({
        backend: 'indexeddb',
      })

      const { result } = renderHook(() => useStorageConfig())

      act(() => {
        result.current.setStorageBackend('dbal')
      })

      await act(async () => {
        await result.current.handleSaveStorageConfig()
      })

      expect(mockStorage.saveStorageConfig).toHaveBeenCalledWith({
        backend: 'dbal',
      })
    })
  })
})
