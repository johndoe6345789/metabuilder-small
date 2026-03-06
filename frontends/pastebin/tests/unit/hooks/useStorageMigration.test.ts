/**
 * Unit Tests for useStorageMigration Hook
 * The hook now returns an empty object since Flask migration is removed.
 */

import { renderHook } from '@testing-library/react';
import { useStorageMigration } from '@/hooks/useStorageMigration';

describe('useStorageMigration Hook', () => {
  it('should return an empty object', () => {
    const { result } = renderHook(() => useStorageMigration());
    expect(result.current).toEqual({});
  });
});
