/**
 * Unit Tests for useStorageConfig Hook
 * Tests storage backend configuration management
 */

import { renderHook, act } from '@testing-library/react';
import { useStorageConfig } from '@/hooks/useStorageConfig';
import * as storage from '@/lib/storage';

jest.mock('@/lib/storage');

// Mock useTranslation to avoid Redux dependency
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    settings: { storage: { backendUpdated: 'Storage backend updated successfully' } },
  }),
}));


describe('useStorageConfig Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (process.env as any).NEXT_PUBLIC_DBAL_API_URL;
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useStorageConfig());

      expect(result.current.storageBackend).toBe('indexeddb');
      expect(result.current.envVarSet).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('should load configuration from storage', () => {
      (storage.loadStorageConfig as jest.Mock).mockReturnValue({
        backend: 'dbal',
        dbalUrl: 'http://localhost:8080',
      });

      const { result } = renderHook(() => useStorageConfig());

      act(() => {
        result.current.loadConfig();
      });

      expect(result.current.storageBackend).toBe('dbal');
    });

    it('should detect environment variable', () => {
      (process.env as any).NEXT_PUBLIC_DBAL_API_URL = 'http://localhost:8080';
      (storage.loadStorageConfig as jest.Mock).mockReturnValue({
        backend: 'indexeddb',
      });

      const { result } = renderHook(() => useStorageConfig());

      act(() => {
        result.current.loadConfig();
      });

      expect(result.current.envVarSet).toBe(true);
    });

    it('should not set envVarSet if no env var', () => {
      (storage.loadStorageConfig as jest.Mock).mockReturnValue({
        backend: 'indexeddb',
      });

      const { result } = renderHook(() => useStorageConfig());

      act(() => {
        result.current.loadConfig();
      });

      expect(result.current.envVarSet).toBe(false);
    });
  });

  describe('handleSaveStorageConfig', () => {
    it('should save indexeddb config without testing', async () => {
      (storage.saveStorageConfig as jest.Mock).mockImplementation();

      const { result } = renderHook(() => useStorageConfig());

      act(() => {
        result.current.setStorageBackend('indexeddb');
      });

      await act(async () => {
        await result.current.handleSaveStorageConfig();
      });

      expect(storage.saveStorageConfig).toHaveBeenCalledWith({
        backend: 'indexeddb',
      });
    });

    it('should call onSuccess callback if provided', async () => {
      (storage.saveStorageConfig as jest.Mock).mockImplementation();
      const onSuccess = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useStorageConfig());

      act(() => {
        result.current.setStorageBackend('indexeddb');
      });

      await act(async () => {
        await result.current.handleSaveStorageConfig(onSuccess);
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should save dbal config', async () => {
      (storage.saveStorageConfig as jest.Mock).mockImplementation();

      const { result } = renderHook(() => useStorageConfig());

      act(() => {
        result.current.setStorageBackend('dbal');
      });

      await act(async () => {
        await result.current.handleSaveStorageConfig();
      });

      expect(storage.saveStorageConfig).toHaveBeenCalledWith({
        backend: 'dbal',
      });
    });
  });

  describe('state setters', () => {
    it('should update storage backend', () => {
      const { result } = renderHook(() => useStorageConfig());

      act(() => {
        result.current.setStorageBackend('dbal');
      });

      expect(result.current.storageBackend).toBe('dbal');
    });
  });

  describe('complex scenarios', () => {
    it('should handle backend switching', () => {
      const { result } = renderHook(() => useStorageConfig());

      act(() => {
        result.current.setStorageBackend('indexeddb');
      });

      expect(result.current.storageBackend).toBe('indexeddb');

      act(() => {
        result.current.setStorageBackend('dbal');
      });

      expect(result.current.storageBackend).toBe('dbal');
    });

    it('should handle full save workflow', async () => {
      (storage.saveStorageConfig as jest.Mock).mockImplementation();

      const onSuccess = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useStorageConfig());

      act(() => {
        result.current.loadConfig();
        result.current.setStorageBackend('indexeddb');
      });

      await act(async () => {
        await result.current.handleSaveStorageConfig(onSuccess);
      });

      expect(storage.saveStorageConfig).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
