import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { setKV, deleteKV } from '@/store/slices/kvSlice'

export function useKV<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const dispatch = useAppDispatch()
  const stored = useAppSelector((state) => state.kv.data[key])
  const value = (stored !== undefined ? stored : defaultValue) as T

  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    if (typeof newValue === 'function') {
      const current = (stored !== undefined ? stored : defaultValue) as T
      const next = (newValue as (prev: T) => T)(current)
      dispatch(setKV({ key, value: next }))
    } else {
      dispatch(setKV({ key, value: newValue }))
    }
  }, [dispatch, key, stored, defaultValue])

  const deleteValue = useCallback(() => {
    dispatch(deleteKV(key))
  }, [dispatch, key])

  return [value, setValue, deleteValue]
}
