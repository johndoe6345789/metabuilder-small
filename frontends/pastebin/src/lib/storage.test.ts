import {
  loadStorageConfig,
  saveStorageConfig,
  getStorageConfig,
  DBALStorageAdapter,
  StorageConfig,
  StorageBackend
} from './storage'

// Mock fetch
global.fetch = jest.fn()

describe('Storage Configuration', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    localStorage.clear()
    delete process.env.NEXT_PUBLIC_DBAL_API_URL
  })

  describe('loadStorageConfig', () => {
    it('should load default config when no env var or localStorage', () => {
      delete process.env.NEXT_PUBLIC_DBAL_API_URL
      const config = loadStorageConfig()
      expect(config.backend).toBe('indexeddb')
      expect(config.dbalUrl).toBeUndefined()
    })

    it('should load DBAL config from env var', () => {
      process.env.NEXT_PUBLIC_DBAL_API_URL = 'http://localhost:8080'
      const config = loadStorageConfig()
      expect(config.backend).toBe('dbal')
      expect(config.dbalUrl).toBe('http://localhost:8080')
    })

    it('should load config from localStorage if no env var', () => {
      delete process.env.NEXT_PUBLIC_DBAL_API_URL
      const savedConfig: StorageConfig = {
        backend: 'dbal',
        dbalUrl: 'http://api.example.com'
      }
      localStorage.setItem(
        'codesnippet-storage-config',
        JSON.stringify(savedConfig)
      )

      const config = loadStorageConfig()
      expect(config.backend).toBe('dbal')
      expect(config.dbalUrl).toBe('http://api.example.com')
    })

    it('should prefer env var over localStorage', () => {
      process.env.NEXT_PUBLIC_DBAL_API_URL = 'http://env-url.com'
      localStorage.setItem(
        'codesnippet-storage-config',
        JSON.stringify({ backend: 'indexeddb' })
      )

      const config = loadStorageConfig()
      expect(config.backend).toBe('dbal')
      expect(config.dbalUrl).toBe('http://env-url.com')
    })

    it('should handle invalid JSON in localStorage', () => {
      delete process.env.NEXT_PUBLIC_DBAL_API_URL
      saveStorageConfig({ backend: 'indexeddb' })
      localStorage.setItem('codesnippet-storage-config', 'invalid json')

      const config = loadStorageConfig()
      expect(config.backend).toBe('indexeddb')
    })

    it('should return default config on error', () => {
      delete process.env.NEXT_PUBLIC_DBAL_API_URL
      saveStorageConfig({ backend: 'indexeddb' })
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error')
      })

      const config = loadStorageConfig()
      expect(config.backend).toBe('indexeddb')
    })
  })

  describe('saveStorageConfig', () => {
    it('should save config to localStorage', () => {
      const config: StorageConfig = {
        backend: 'dbal',
        dbalUrl: 'http://localhost:8080'
      }

      saveStorageConfig(config)

      const saved = localStorage.getItem('codesnippet-storage-config')
      expect(saved).toBe(JSON.stringify(config))
    })

    it('should update current config after save', () => {
      const config: StorageConfig = {
        backend: 'dbal',
        dbalUrl: 'http://localhost:8080'
      }

      saveStorageConfig(config)
      const current = getStorageConfig()

      expect(current.backend).toBe('dbal')
      expect(current.dbalUrl).toBe('http://localhost:8080')
    })

    it('should handle storage errors', () => {
      const config: StorageConfig = {
        backend: 'indexeddb'
      }

      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full')
      })

      expect(() => saveStorageConfig(config)).not.toThrow()
    })

    it('should save IndexedDB config without dbalUrl', () => {
      const config: StorageConfig = {
        backend: 'indexeddb'
      }

      saveStorageConfig(config)

      const saved = localStorage.getItem('codesnippet-storage-config')
      expect(saved).toBe(JSON.stringify(config))
    })
  })

  describe('getStorageConfig', () => {
    it('should return current configuration', () => {
      const config: StorageConfig = {
        backend: 'dbal',
        dbalUrl: 'http://localhost:8080'
      }

      saveStorageConfig(config)
      const current = getStorageConfig()

      expect(current).toEqual(config)
    })

    it('should return same instance on repeated calls', () => {
      const config1 = getStorageConfig()
      const config2 = getStorageConfig()

      expect(config1).toBe(config2)
    })
  })
})

describe('DBALStorageAdapter', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('constructor', () => {
    it('should create adapter with valid URL', () => {
      const adapter = new DBALStorageAdapter('http://localhost:8080')
      expect(adapter).toBeDefined()
    })
  })

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      const adapter = new DBALStorageAdapter('http://localhost:8080')
      const result = await adapter.testConnection()

      expect(result).toBe(true)
    })

    it('should return false on failed connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response)

      const adapter = new DBALStorageAdapter('http://localhost:8080')
      const result = await adapter.testConnection()

      expect(result).toBe(false)
    })

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const adapter = new DBALStorageAdapter('http://localhost:8080')
      const result = await adapter.testConnection()

      expect(result).toBe(false)
    })
  })
})
