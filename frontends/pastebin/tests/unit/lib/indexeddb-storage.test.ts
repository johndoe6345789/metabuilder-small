/**
 * Unit Tests for IndexedDB Storage
 * Tests IndexedDB wrapper functions for snippets and namespaces
 */

import type { Snippet, Namespace } from '@/lib/types';

// Mock IndexedDB
class MockIDBDatabase {
  objectStoreNames = { contains: jest.fn(() => false) };
  createObjectStore = jest.fn(() => ({
    createIndex: jest.fn(),
  }));
  transaction = jest.fn();
  close = jest.fn();
}

class MockIDBObjectStore {
  add = jest.fn();
  put = jest.fn();
  get = jest.fn();
  getAll = jest.fn();
  delete = jest.fn();
  clear = jest.fn();
  index = jest.fn();
}

class MockIDBTransaction {
  onerror: ((event: Event) => void) | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  oncomplete: ((event: Event) => void) | null = null;
  objectStore = jest.fn();
  error: Error | null = null;
}

class MockIDBRequest {
  onerror: ((event: Event) => void) | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null;
  result: any = null;
  error: Error | null = null;
}

describe('IndexedDB Storage', () => {
  let mockDB: MockIDBDatabase;
  let mockRequest: MockIDBRequest;
  let idbStorage: typeof import('@/lib/indexeddb-storage');

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    mockDB = new MockIDBDatabase();
    mockRequest = new MockIDBRequest();

    // Mock indexedDB — default: fires onsuccess after a tick
    global.indexedDB = {
      open: jest.fn((_dbName, _version) => {
        mockRequest.result = mockDB;
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess(new Event('success'));
          }
        }, 0);
        return mockRequest as any;
      }),
    } as any;

    // Re-import after resetModules so dbInstance is fresh each test
    idbStorage = await import('@/lib/indexeddb-storage');
  });

  describe('openDB', () => {
    it('should open database connection', async () => {
      const db = await idbStorage.openDB();
      expect(db).toBeTruthy();
    });

    it('should reuse existing connection', async () => {
      const db1 = await idbStorage.openDB();
      const db2 = await idbStorage.openDB();
      expect(db1).toBe(db2);
    });

    it('should handle database open error', async () => {
      // Override: fire onerror instead of onsuccess
      (global.indexedDB.open as jest.Mock).mockImplementationOnce((_dbName: string, _version: number) => {
        mockRequest.result = null;
        mockRequest.error = new Error('Database error');
        setTimeout(() => {
          if (mockRequest.onerror) {
            mockRequest.onerror(new Event('error'));
          }
        }, 0);
        return mockRequest as any;
      });

      const promise = idbStorage.openDB();
      await expect(promise).rejects.toThrow();
    });

    it('should create snippets store on upgrade', async () => {
      mockDB.objectStoreNames.contains = jest.fn(() => false) as any;

      const promise = idbStorage.openDB();
      // Let the open call register handlers
      await new Promise(resolve => setTimeout(resolve, 0));

      if (mockRequest.onupgradeneeded) {
        // Supply event.target so the handler can read .result
        // (Event.target is read-only, must use defineProperty)
        const upgradeEvent = new Event('upgradeneeded');
        Object.defineProperty(upgradeEvent, 'target', { value: mockRequest, writable: false });
        mockRequest.onupgradeneeded(upgradeEvent as any);
      }

      await promise;
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('snippets', { keyPath: 'id' });
    });

    it('should create namespaces store on upgrade', async () => {
      mockDB.objectStoreNames.contains = jest.fn(() => false) as any;

      const promise = idbStorage.openDB();
      await new Promise(resolve => setTimeout(resolve, 0));

      if (mockRequest.onupgradeneeded) {
        const upgradeEvent = new Event('upgradeneeded');
        Object.defineProperty(upgradeEvent, 'target', { value: mockRequest, writable: false });
        mockRequest.onupgradeneeded(upgradeEvent as any);
      }

      await promise;
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('namespaces', { keyPath: 'id' });
    });

    it('should skip store creation if already exists', async () => {
      mockDB.objectStoreNames.contains = jest.fn(() => true) as any;
      const createObjectStoreSpy = jest.spyOn(mockDB, 'createObjectStore');

      const promise = idbStorage.openDB();
      await new Promise(resolve => setTimeout(resolve, 0));

      if (mockRequest.onupgradeneeded) {
        const upgradeEvent = new Event('upgradeneeded');
        Object.defineProperty(upgradeEvent, 'target', { value: mockRequest, writable: false });
        mockRequest.onupgradeneeded(upgradeEvent as any);
      }

      await promise;
      expect(createObjectStoreSpy).not.toHaveBeenCalled();
    });
  });

  describe('Snippet operations', () => {
    let mockTransaction: MockIDBTransaction;
    let mockObjectStore: MockIDBObjectStore;
    let mockIndexRequest: MockIDBRequest;

    beforeEach(() => {
      mockTransaction = new MockIDBTransaction();
      mockObjectStore = new MockIDBObjectStore();
      mockIndexRequest = new MockIDBRequest();

      mockDB.transaction = jest.fn(() => mockTransaction);
      mockTransaction.objectStore = jest.fn(() => mockObjectStore);
      mockObjectStore.index = jest.fn(() => mockObjectStore);
    });

    describe('getAllSnippets', () => {
      it('should retrieve all snippets', async () => {
        const snippets: Snippet[] = [
          {
            id: '1',
            title: 'Test',
            description: '',
            language: 'javascript',
            code: 'console.log("test")',
            category: 'general',
            hasPreview: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            namespaceId: 'default',
            isTemplate: false,
          },
        ];

        let getAllRequest: any;
        mockObjectStore.getAll = jest.fn(() => {
          getAllRequest = { onerror: null, onsuccess: null, result: snippets };
          return getAllRequest;
        }) as any;

        const promise = idbStorage.getAllSnippets();
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getAllRequest?.onsuccess) {
          getAllRequest.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toEqual(snippets);
      });

      it('should return empty array when no snippets', async () => {
        let getAllRequest: any;
        mockObjectStore.getAll = jest.fn(() => {
          getAllRequest = { result: [], onsuccess: null, onerror: null };
          return getAllRequest;
        }) as any;

        const promise = idbStorage.getAllSnippets();
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getAllRequest?.onsuccess) {
          getAllRequest.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toEqual([]);
      });

      it('should handle read errors', async () => {
        let getAllRequest: any;
        mockObjectStore.getAll = jest.fn(() => {
          getAllRequest = { onerror: null, onsuccess: null, error: new Error('Read error') };
          return getAllRequest;
        }) as any;

        const promise = idbStorage.getAllSnippets();
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getAllRequest?.onerror) {
          getAllRequest.onerror(new Event('error'));
        }

        await expect(promise).rejects.toThrow();
      });
    });

    describe('getSnippet', () => {
      it('should retrieve snippet by id', async () => {
        const snippet: Snippet = {
          id: '1',
          title: 'Test',
          description: '',
          language: 'javascript',
          code: 'console.log("test")',
          category: 'general',
          hasPreview: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          namespaceId: 'default',
          isTemplate: false,
        };

        let getRequest: any;
        mockObjectStore.get = jest.fn(() => {
          getRequest = { result: snippet, onsuccess: null, onerror: null };
          return getRequest;
        }) as any;

        const promise = idbStorage.getSnippet('1');
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getRequest?.onsuccess) {
          getRequest.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toEqual(snippet);
      });

      it('should return null when snippet not found', async () => {
        let getRequest: any;
        mockObjectStore.get = jest.fn(() => {
          getRequest = { result: undefined, onsuccess: null, onerror: null };
          return getRequest;
        }) as any;

        const promise = idbStorage.getSnippet('nonexistent');
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getRequest?.onsuccess) {
          getRequest.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toBeNull();
      });
    });

    describe('createSnippet', () => {
      it('should create snippet successfully', async () => {
        const snippet: Snippet = {
          id: '1',
          title: 'New',
          description: '',
          language: 'javascript',
          code: 'console.log("new")',
          category: 'general',
          hasPreview: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          namespaceId: 'default',
          isTemplate: false,
        };

        let addRequest: any;
        mockObjectStore.add = jest.fn(() => {
          addRequest = { onsuccess: null, onerror: null };
          return addRequest;
        }) as any;

        const promise = idbStorage.createSnippet(snippet);
        await new Promise(resolve => setTimeout(resolve, 10));

        if (addRequest?.onsuccess) {
          addRequest.onsuccess(new Event('success'));
        }

        await expect(promise).resolves.not.toThrow();
        expect(mockObjectStore.add).toHaveBeenCalledWith(snippet);
      });

      it('should handle duplicate key error', async () => {
        const snippet = { id: '1' } as Snippet;

        let addRequest: any;
        mockObjectStore.add = jest.fn(() => {
          addRequest = { onerror: null, onsuccess: null, error: new Error('Duplicate key') };
          return addRequest;
        }) as any;

        const promise = idbStorage.createSnippet(snippet);
        await new Promise(resolve => setTimeout(resolve, 10));

        if (addRequest?.onerror) {
          addRequest.onerror(new Event('error'));
        }

        await expect(promise).rejects.toThrow();
      });
    });

    describe('updateSnippet', () => {
      it('should update snippet successfully', async () => {
        const snippet: Snippet = {
          id: '1',
          title: 'Updated',
          description: '',
          language: 'javascript',
          code: 'console.log("updated")',
          category: 'general',
          hasPreview: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          namespaceId: 'default',
          isTemplate: false,
        };

        let putRequest: any;
        mockObjectStore.put = jest.fn(() => {
          putRequest = { onsuccess: null, onerror: null };
          return putRequest;
        }) as any;

        const promise = idbStorage.updateSnippet(snippet);
        await new Promise(resolve => setTimeout(resolve, 10));

        if (putRequest?.onsuccess) {
          putRequest.onsuccess(new Event('success'));
        }

        await expect(promise).resolves.not.toThrow();
        expect(mockObjectStore.put).toHaveBeenCalledWith(snippet);
      });
    });

    describe('deleteSnippet', () => {
      it('should delete snippet successfully', async () => {
        let deleteRequest: any;
        mockObjectStore.delete = jest.fn(() => {
          deleteRequest = { onsuccess: null, onerror: null };
          return deleteRequest;
        }) as any;

        const promise = idbStorage.deleteSnippet('1');
        await new Promise(resolve => setTimeout(resolve, 10));

        if (deleteRequest?.onsuccess) {
          deleteRequest.onsuccess(new Event('success'));
        }

        await expect(promise).resolves.not.toThrow();
        expect(mockObjectStore.delete).toHaveBeenCalledWith('1');
      });

      it('should handle delete errors gracefully', async () => {
        let deleteRequest: any;
        mockObjectStore.delete = jest.fn(() => {
          deleteRequest = { onerror: null, onsuccess: null, error: new Error('Delete failed') };
          return deleteRequest;
        }) as any;

        const promise = idbStorage.deleteSnippet('1');
        await new Promise(resolve => setTimeout(resolve, 10));

        if (deleteRequest?.onerror) {
          deleteRequest.onerror(new Event('error'));
        }

        await expect(promise).rejects.toThrow();
      });
    });

    describe('getSnippetsByNamespace', () => {
      it('should retrieve snippets by namespace', async () => {
        const snippets: Snippet[] = [
          {
            id: '1',
            title: 'Test',
            description: '',
            language: 'javascript',
            code: 'console.log("test")',
            category: 'general',
            hasPreview: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            namespaceId: 'ns1',
            isTemplate: false,
          },
        ];

        let getAllRequest: any;
        mockObjectStore.getAll = jest.fn(() => {
          getAllRequest = { result: snippets, onsuccess: null, onerror: null };
          return getAllRequest;
        }) as any;

        const promise = idbStorage.getSnippetsByNamespace('ns1');
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getAllRequest?.onsuccess) {
          getAllRequest.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toEqual(snippets);
      });

      it('should return empty array when no snippets in namespace', async () => {
        let getAllRequest: any;
        mockObjectStore.getAll = jest.fn(() => {
          getAllRequest = { result: [], onsuccess: null, onerror: null };
          return getAllRequest;
        }) as any;

        const promise = idbStorage.getSnippetsByNamespace('empty-ns');
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getAllRequest?.onsuccess) {
          getAllRequest.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toEqual([]);
      });
    });
  });

  describe('Namespace operations', () => {
    let mockTransaction: MockIDBTransaction;
    let mockObjectStore: MockIDBObjectStore;

    beforeEach(() => {
      mockTransaction = new MockIDBTransaction();
      mockObjectStore = new MockIDBObjectStore();

      mockDB.transaction = jest.fn(() => mockTransaction);
      mockTransaction.objectStore = jest.fn(() => mockObjectStore);
    });

    describe('getAllNamespaces', () => {
      it('should retrieve all namespaces', async () => {
        const namespaces: Namespace[] = [
          { id: '1', name: 'Default', createdAt: Date.now(), isDefault: true },
        ];

        let getAllRequest: any;
        mockObjectStore.getAll = jest.fn(() => {
          getAllRequest = { result: namespaces, onsuccess: null, onerror: null };
          return getAllRequest;
        }) as any;

        const promise = idbStorage.getAllNamespaces();
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getAllRequest?.onsuccess) {
          getAllRequest.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toEqual(namespaces);
      });
    });

    describe('getNamespace', () => {
      it('should retrieve namespace by id', async () => {
        const namespace: Namespace = {
          id: '1',
          name: 'Test',
          createdAt: Date.now(),
          isDefault: false,
        };

        let getRequest: any;
        mockObjectStore.get = jest.fn(() => {
          getRequest = { result: namespace, onsuccess: null, onerror: null };
          return getRequest;
        }) as any;

        const promise = idbStorage.getNamespace('1');
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getRequest?.onsuccess) {
          getRequest.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toEqual(namespace);
      });

      it('should return null when namespace not found', async () => {
        let getRequest: any;
        mockObjectStore.get = jest.fn(() => {
          getRequest = { result: undefined, onsuccess: null, onerror: null };
          return getRequest;
        }) as any;

        const promise = idbStorage.getNamespace('nonexistent');
        await new Promise(resolve => setTimeout(resolve, 10));

        if (getRequest?.onsuccess) {
          getRequest.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toBeNull();
      });
    });

    describe('createNamespace', () => {
      it('should create namespace successfully', async () => {
        const namespace: Namespace = {
          id: '1',
          name: 'New',
          createdAt: Date.now(),
          isDefault: false,
        };

        let addRequest: any;
        mockObjectStore.add = jest.fn(() => {
          addRequest = { onsuccess: null, onerror: null };
          return addRequest;
        }) as any;

        const promise = idbStorage.createNamespace(namespace);
        await new Promise(resolve => setTimeout(resolve, 10));

        if (addRequest?.onsuccess) {
          addRequest.onsuccess(new Event('success'));
        }

        await expect(promise).resolves.not.toThrow();
      });
    });

    describe('updateNamespace', () => {
      it('should update namespace successfully', async () => {
        const namespace: Namespace = {
          id: '1',
          name: 'Updated',
          createdAt: Date.now(),
          isDefault: false,
        };

        let putRequest: any;
        mockObjectStore.put = jest.fn(() => {
          putRequest = { onsuccess: null, onerror: null };
          return putRequest;
        }) as any;

        const promise = idbStorage.updateNamespace(namespace);
        await new Promise(resolve => setTimeout(resolve, 10));

        if (putRequest?.onsuccess) {
          putRequest.onsuccess(new Event('success'));
        }

        await expect(promise).resolves.not.toThrow();
      });
    });

    describe('deleteNamespace', () => {
      it('should delete namespace successfully', async () => {
        let deleteRequest: any;
        mockObjectStore.delete = jest.fn(() => {
          deleteRequest = { onsuccess: null, onerror: null };
          return deleteRequest;
        }) as any;

        const promise = idbStorage.deleteNamespace('1');
        await new Promise(resolve => setTimeout(resolve, 10));

        if (deleteRequest?.onsuccess) {
          deleteRequest.onsuccess(new Event('success'));
        }

        await expect(promise).resolves.not.toThrow();
      });
    });
  });

  describe('Database operations', () => {
    let mockTransaction: MockIDBTransaction;
    let mockObjectStore: MockIDBObjectStore;

    beforeEach(() => {
      mockTransaction = new MockIDBTransaction();
      mockObjectStore = new MockIDBObjectStore();

      mockDB.transaction = jest.fn(() => mockTransaction);
      mockTransaction.objectStore = jest.fn(() => mockObjectStore);
    });

    describe('clearDatabase', () => {
      it('should clear all stores successfully', async () => {
        mockObjectStore.clear = jest.fn();

        const promise = idbStorage.clearDatabase();
        await new Promise(resolve => setTimeout(resolve, 10));

        if (mockTransaction.oncomplete) {
          mockTransaction.oncomplete(new Event('complete'));
        }

        await expect(promise).resolves.not.toThrow();
        expect(mockObjectStore.clear).toHaveBeenCalled();
      });

      it('should handle clear errors', async () => {
        const promise = idbStorage.clearDatabase();
        await new Promise(resolve => setTimeout(resolve, 10));

        mockTransaction.error = new Error('Clear failed');
        if (mockTransaction.onerror) {
          mockTransaction.onerror(new Event('error'));
        }

        await expect(promise).rejects.toThrow();
      });
    });

    describe('getDatabaseStats', () => {
      it('should return database statistics', async () => {
        const snippets: Snippet[] = [
          {
            id: '1',
            title: 'Test',
            description: '',
            language: 'javascript',
            code: '',
            category: 'general',
            hasPreview: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            namespaceId: 'default',
            isTemplate: false,
          },
          {
            id: '2',
            title: 'Template',
            description: '',
            language: 'javascript',
            code: '',
            category: 'general',
            hasPreview: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            namespaceId: 'default',
            isTemplate: true,
          },
        ];

        // getDatabaseStats calls getAllSnippets then getAllNamespaces sequentially.
        // Each call creates its own transaction + store, so we capture requests per call.
        const requests: any[] = [];
        mockObjectStore.getAll = jest.fn(() => {
          const req = { result: snippets, onsuccess: null as any, onerror: null as any };
          requests.push(req);
          return req;
        }) as any;

        const promise = idbStorage.getDatabaseStats();
        // Give the first openDB + first getAll time to register
        await new Promise(resolve => setTimeout(resolve, 10));

        // Resolve each pending getAll request
        for (const req of requests) {
          if (req.onsuccess) req.onsuccess(new Event('success'));
          // Let subsequent async steps proceed
          await new Promise(resolve => setTimeout(resolve, 5));
        }
        // Pick up any late-registered requests
        for (const req of requests) {
          if (req.onsuccess) req.onsuccess(new Event('success'));
        }

        const stats = await promise;
        expect(stats).toHaveProperty('snippetCount');
        expect(stats).toHaveProperty('templateCount');
        expect(stats).toHaveProperty('namespaceCount');
      });
    });

    describe('exportDatabase', () => {
      it('should export database successfully', async () => {
        const requests: any[] = [];
        mockObjectStore.getAll = jest.fn(() => {
          const req = { result: [], onsuccess: null as any, onerror: null as any };
          requests.push(req);
          return req;
        }) as any;

        const promise = idbStorage.exportDatabase();
        await new Promise(resolve => setTimeout(resolve, 10));

        for (const req of requests) {
          if (req.onsuccess) req.onsuccess(new Event('success'));
          await new Promise(resolve => setTimeout(resolve, 5));
        }
        for (const req of requests) {
          if (req.onsuccess) req.onsuccess(new Event('success'));
        }

        const result = await promise;
        expect(result).toHaveProperty('snippets');
        expect(result).toHaveProperty('namespaces');
      });
    });

    describe('importDatabase', () => {
      it('should import database successfully', async () => {
        mockObjectStore.add = jest.fn(() => ({
          onsuccess: null,
          onerror: null,
        })) as any;

        mockObjectStore.clear = jest.fn();

        const data = {
          snippets: [] as Snippet[],
          namespaces: [] as Namespace[],
        };

        // importDatabase calls clearDatabase first (needs oncomplete), then creates
        // a second transaction for the actual import (also needs oncomplete).
        // We fire oncomplete for each transaction created.
        mockDB.transaction = jest.fn(() => {
          const tx = new MockIDBTransaction();
          tx.objectStore = jest.fn(() => mockObjectStore);
          // Auto-complete after a tick so both clearDatabase and importDatabase resolve
          setTimeout(() => {
            if (tx.oncomplete) tx.oncomplete(new Event('complete'));
          }, 5);
          return tx;
        });

        const promise = idbStorage.importDatabase(data);
        await expect(promise).resolves.not.toThrow();
      });

      it('should handle import errors', async () => {
        mockObjectStore.clear = jest.fn();

        const data = {
          snippets: [] as Snippet[],
          namespaces: [] as Namespace[],
        };

        let callCount = 0;
        mockDB.transaction = jest.fn(() => {
          const tx = new MockIDBTransaction();
          tx.objectStore = jest.fn(() => mockObjectStore);
          callCount++;
          if (callCount === 1) {
            // First transaction (clearDatabase) succeeds
            setTimeout(() => {
              if (tx.oncomplete) tx.oncomplete(new Event('complete'));
            }, 5);
          } else {
            // Second transaction (importDatabase) errors
            tx.error = new Error('Import failed');
            setTimeout(() => {
              if (tx.onerror) tx.onerror(new Event('error'));
            }, 5);
          }
          return tx;
        });

        const promise = idbStorage.importDatabase(data);
        await expect(promise).rejects.toThrow();
      });
    });
  });
});
