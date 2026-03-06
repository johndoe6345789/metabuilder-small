import { renderHook } from '@testing-library/react'
import { useStorageMigration } from './useStorageMigration'

describe('useStorageMigration Hook', () => {
  it('should return an empty object', () => {
    const { result } = renderHook(() => useStorageMigration())
    expect(result.current).toEqual({})
  })

  it('should not throw on mount', () => {
    expect(() => renderHook(() => useStorageMigration())).not.toThrow()
  })
})
