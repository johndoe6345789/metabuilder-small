/**
 * Unit Tests for Storage Configuration and DBAL Adapter
 * Tests HTTP communication with DBAL backend and storage config management.
 */

import {
  StorageBackend,
  StorageConfig,
  loadStorageConfig,
  saveStorageConfig,
  getStorageConfig,
  DBALStorageAdapter,
} from '@/lib/storage';
import type { Snippet, Namespace } from '@/lib/types';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to create mock snippet with all required fields
function createMockSnippet(overrides?: Partial<Snippet>): Snippet {
  const now = Date.now();
  return {
    id: '1',
    title: 'Test Snippet',
    description: 'A test snippet',
    language: 'javascript',
    code: 'console.log("test")',
    category: 'general',
    hasPreview: false,
    createdAt: now,
    updatedAt: now,
    namespaceId: 'default',
    isTemplate: false,
    ...overrides,
  };
}

// Helper to create mock namespace
function createMockNamespace(overrides?: Partial<Namespace>): Namespace {
  return {
    id: '1',
    name: 'Test Namespace',
    createdAt: Date.now(),
    isDefault: false,
    ...overrides,
  };
}

describe('Storage Config Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.resetModules();
    delete process.env.NEXT_PUBLIC_DBAL_API_URL;
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('loadStorageConfig', () => {
    it('should return indexeddb config when no env var and no localStorage', () => {
      const config = loadStorageConfig();
      expect(config.backend).toBe('indexeddb');
    });

    it('should return dbal config when NEXT_PUBLIC_DBAL_API_URL env var is set', () => {
      process.env.NEXT_PUBLIC_DBAL_API_URL = 'http://localhost:8080';
      const config = loadStorageConfig();
      expect(config.backend).toBe('dbal');
      expect(config.dbalUrl).toBe('http://localhost:8080');
    });

    it('should load config from localStorage when available', () => {
      const savedConfig: StorageConfig = {
        backend: 'indexeddb',
      };
      localStorage.setItem('codesnippet-storage-config', JSON.stringify(savedConfig));
      const config = loadStorageConfig();
      expect(config.backend).toBe('indexeddb');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('codesnippet-storage-config', 'invalid json {');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const config = loadStorageConfig();
      expect(config.backend).toBe('indexeddb');
      consoleWarnSpy.mockRestore();
    });

    it('should prefer env var over localStorage', () => {
      process.env.NEXT_PUBLIC_DBAL_API_URL = 'http://api.example.com';
      localStorage.setItem('codesnippet-storage-config', JSON.stringify({ backend: 'indexeddb' }));
      const config = loadStorageConfig();
      expect(config.backend).toBe('dbal');
      expect(config.dbalUrl).toBe('http://api.example.com');
    });
  });

  describe('saveStorageConfig', () => {
    it('should save config to localStorage', () => {
      const config: StorageConfig = {
        backend: 'dbal',
        dbalUrl: 'http://localhost:8080',
      };
      saveStorageConfig(config);
      const saved = localStorage.getItem('codesnippet-storage-config');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved!)).toEqual(config);
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const storageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const config: StorageConfig = { backend: 'indexeddb' };
      saveStorageConfig(config);

      storageSetItemSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getStorageConfig', () => {
    it('should return current config', () => {
      const config: StorageConfig = {
        backend: 'dbal',
        dbalUrl: 'http://test.com',
      };
      saveStorageConfig(config);
      const retrieved = getStorageConfig();
      expect(retrieved.backend).toBe('dbal');
      expect(retrieved.dbalUrl).toBe('http://test.com');
    });
  });
});

describe('DBALStorageAdapter', () => {
  const baseUrl = 'http://localhost:8080';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('constructor', () => {
    it('should create adapter with valid URL', () => {
      const adapter = new DBALStorageAdapter(baseUrl);
      expect(adapter).toBeTruthy();
    });

    it('should strip trailing slash from URL', () => {
      const adapter = new DBALStorageAdapter('http://localhost:8080/');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
      adapter.getAllSnippets();
      expect((global.fetch as jest.Mock).mock.calls[0][0]).not.toContain('http://localhost:8080//');
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      const adapter = new DBALStorageAdapter(baseUrl);
      const result = await adapter.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on failed connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
      const adapter = new DBALStorageAdapter(baseUrl);
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const adapter = new DBALStorageAdapter(baseUrl);
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });

    it('should handle abort/timeout error gracefully', async () => {
      const abortError = new Error('AbortError: The operation was aborted');
      (global.fetch as jest.Mock).mockRejectedValue(abortError);
      const adapter = new DBALStorageAdapter(baseUrl);
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getAllSnippets', () => {
    it('should fetch all snippets', async () => {
      const mockSnippets: Snippet[] = [createMockSnippet()];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSnippets }),
      });
      const adapter = new DBALStorageAdapter(baseUrl);
      const result = await adapter.getAllSnippets();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Snippet');
    });

    it('should throw on failed fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, statusText: 'Server Error' });
      const adapter = new DBALStorageAdapter(baseUrl);
      await expect(adapter.getAllSnippets()).rejects.toThrow('Failed to fetch snippets');
    });
  });

  describe('getSnippet', () => {
    it('should fetch single snippet by id', async () => {
      const mockSnippet: Snippet = createMockSnippet({ id: 'abc' });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSnippet }),
      });
      const adapter = new DBALStorageAdapter(baseUrl);
      const result = await adapter.getSnippet('abc');
      expect(result?.id).toBe('abc');
    });

    it('should return null for failed response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const adapter = new DBALStorageAdapter(baseUrl);
      const result = await adapter.getSnippet('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createSnippet', () => {
    it('should create snippet successfully', async () => {
      const snippet = createMockSnippet();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: snippet }) });
      const adapter = new DBALStorageAdapter(baseUrl);
      await expect(adapter.createSnippet(snippet)).resolves.not.toThrow();
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('updateSnippet', () => {
    it('should update snippet successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
      const adapter = new DBALStorageAdapter(baseUrl);
      const snippet = createMockSnippet({ id: '1' });
      await expect(adapter.updateSnippet(snippet)).resolves.not.toThrow();
    });
  });

  describe('deleteSnippet', () => {
    it('should delete snippet successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      const adapter = new DBALStorageAdapter(baseUrl);
      await expect(adapter.deleteSnippet('1')).resolves.not.toThrow();
    });
  });

  describe('namespace operations', () => {
    it('should fetch all namespaces', async () => {
      const mockNamespaces: Namespace[] = [createMockNamespace()];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockNamespaces }),
      });
      const adapter = new DBALStorageAdapter(baseUrl);
      const result = await adapter.getAllNamespaces();
      expect(result).toHaveLength(1);
    });

    it('should create namespace', async () => {
      const ns = createMockNamespace();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: ns }) });
      const adapter = new DBALStorageAdapter(baseUrl);
      await expect(adapter.createNamespace(ns)).resolves.not.toThrow();
    });

    it('should delete namespace', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      const adapter = new DBALStorageAdapter(baseUrl);
      await expect(adapter.deleteNamespace('1')).resolves.not.toThrow();
    });
  });
});
