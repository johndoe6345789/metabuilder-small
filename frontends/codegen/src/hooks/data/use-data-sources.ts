import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useState, useCallback, useMemo } from 'react'
import { useUIState } from '@/hooks/use-ui-state'
import { DataSource } from '@/types/json-ui'
import { setNestedValue } from '@/lib/json-ui/utils'
import { evaluateExpression, evaluateTemplate } from '@/lib/json-ui/expression-evaluator'

export function useDataSources(dataSources: DataSource[]) {
  const [localOverrides, setLocalOverrides] = useState<Record<string, any>>({})

  const kvSources = useMemo(
    () => dataSources.filter(ds => ds.type === 'kv'),
    [dataSources]
  )

  // Memoize kvSources to prevent new array reference each render
  const kvSources = useMemo(
    () => dataSources.filter(ds => ds.type === 'kv'),
    [dataSources]
  )

  const kvState0 = useUIState(kvSources[0]?.key || 'ds-0', kvSources[0]?.defaultValue)
  const kvState1 = useUIState(kvSources[1]?.key || 'ds-1', kvSources[1]?.defaultValue)
  const kvState2 = useUIState(kvSources[2]?.key || 'ds-2', kvSources[2]?.defaultValue)
  const kvState3 = useUIState(kvSources[3]?.key || 'ds-3', kvSources[3]?.defaultValue)
  const kvState4 = useUIState(kvSources[4]?.key || 'ds-4', kvSources[4]?.defaultValue)

  // Extract values for stable dependency tracking (arrays recreated each render)
  const kvVal0 = kvState0[0], kvVal1 = kvState1[0], kvVal2 = kvState2[0], kvVal3 = kvState3[0], kvVal4 = kvState4[0]
  const kvStates = [kvState0, kvState1, kvState2, kvState3, kvState4]

  useEffect(() => {
    const newData: Record<string, any> = {}

    dataSources.forEach((source) => {
      if (source.type === 'kv') {
        const kvIndex = kvSources.indexOf(source)
        if (kvIndex !== -1 && kvStates[kvIndex]) {
          newData[source.id] = kvStates[kvIndex][0]
        }
      } else if (source.type === 'static') {
        newData[source.id] = source.defaultValue
      }
    })

    setData(newData)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync KV values when they change (e.g. IndexedDB hydration)
  // Uses individual kvVal* values as deps — stable per useUIState contract
  const initDone = useRef(false)
  useEffect(() => {
    // Skip the first run (init effect handles it)
    if (!initDone.current) { initDone.current = true; return }
    if (!kvSources.length) return
    setData(prev => {
      const next = { ...prev }
      let changed = false
      kvSources.forEach((source, kvIndex) => {
        if (kvStates[kvIndex] && prev[source.id] !== kvStates[kvIndex][0]) {
          next[source.id] = kvStates[kvIndex][0]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [kvVal0, kvVal1, kvVal2, kvVal3, kvVal4, kvSources]) // eslint-disable-line react-hooks/exhaustive-deps

  const derivedData = useMemo(() => {
    const derivedSources = dataSources.filter(ds => ds.expression || ds.valueTemplate)
    const result: Record<string, any> = {}
  const kv0 = kvState0[0]
  const kv1 = kvState1[0]
  const kv2 = kvState2[0]
  const kv3 = kvState3[0]
  const kv4 = kvState4[0]
  const kvValues = [kv0, kv1, kv2, kv3, kv4]

  const kvSetters = useMemo(
    () => [kvState0[1], kvState1[1], kvState2[1], kvState3[1], kvState4[1]],
    [kvState0[1], kvState1[1], kvState2[1], kvState3[1], kvState4[1]]
  )

  const baseData = useMemo(() => {
    const result: Record<string, any> = {}

    dataSources.forEach((source) => {
      if (source.type === 'kv') {
        const kvIndex = kvSources.indexOf(source)
        if (kvIndex !== -1) {
          result[source.id] = kvValues[kvIndex]
        }
      } else if (source.type === 'static') {
        result[source.id] = source.defaultValue
      }
    })

    return result
  }, [dataSources, kvSources, kv0, kv1, kv2, kv3, kv4])

  const data = useMemo(
    () => (Object.keys(localOverrides).length > 0
      ? { ...baseData, ...localOverrides }
      : baseData),
    [baseData, localOverrides]
  )

  const derivedSources = useMemo(
    () => dataSources.filter(ds => ds.expression || ds.valueTemplate),
    [dataSources]
  )

  const allData = useMemo(() => {
    if (derivedSources.length === 0) return data

    const result: Record<string, any> = { ...data }

    derivedSources.forEach(source => {
      const deps = source.dependencies || []
      const hasAllDeps = deps.every(dep => dep in result)

      if (hasAllDeps) {
        const evaluationContext = { data }
        result[source.id] = source.expression
        const evaluationContext = { data: result }
        const derivedValue = source.expression
          ? evaluateExpression(source.expression, evaluationContext)
          : source.valueTemplate
            ? evaluateTemplate(source.valueTemplate, evaluationContext)
            : source.defaultValue
        result[source.id] = derivedValue
      }
    })

    return result
  }, [data, dataSources])
  }, [data, derivedSources])

  const mergedData = useMemo(() => ({ ...data, ...derivedData }), [data, derivedData])

  const updateData = useCallback((sourceId: string, value: any) => {
    const source = dataSources.find(ds => ds.id === sourceId)

    if (!source) {
      console.warn(`Data source ${sourceId} not found`)
      return
    }

    if (source.type === 'kv') {
      const kvIndex = kvSources.indexOf(source)
      if (kvIndex !== -1) {
        kvSetters[kvIndex](value)
      }
    } else {
      setLocalOverrides(prev => ({ ...prev, [sourceId]: value }))
    }
  }, [dataSources, kvSources, kvSetters])

  const updatePath = useCallback((sourceId: string, path: string, value: any) => {
    const source = dataSources.find(ds => ds.id === sourceId)

    if (!source) {
      console.warn(`Data source ${sourceId} not found`)
      return
    }

    const currentData = allData[sourceId]
    if (!currentData || typeof currentData !== 'object') {
      return
    }

    const newData = Array.isArray(currentData) ? [...currentData] : { ...currentData }
    setNestedValue(newData, path, value)

    if (source.type === 'kv') {
      const kvIndex = kvSources.indexOf(source)
      if (kvIndex !== -1) {
        kvSetters[kvIndex](newData)
      }
    } else {
      setLocalOverrides(prev => ({ ...prev, [sourceId]: newData }))
    }
  }, [dataSources, kvSources, kvSetters, allData])

  return {
    data: mergedData,
    data: allData,
    updateData,
    updatePath,
    loading: false,
  }
}
