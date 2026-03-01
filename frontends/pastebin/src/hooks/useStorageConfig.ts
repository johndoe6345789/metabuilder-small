import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  saveStorageConfig,
  loadStorageConfig,
  FlaskStorageAdapter,
  type StorageBackend
} from '@/lib/storage'
import { useTranslation } from '@/hooks/useTranslation'

export function useStorageConfig() {
  const t = useTranslation()
  const [storageBackend, setStorageBackend] = useState<StorageBackend>('indexeddb')
  const [flaskUrl, setFlaskUrl] = useState('')
  const [flaskConnectionStatus, setFlaskConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')
  const [testingConnection, setTestingConnection] = useState(false)
  const [envVarSet, setEnvVarSet] = useState(false)

  const testFlaskConnection = useCallback(async (url: string) => {
    setTestingConnection(true)
    try {
      const adapter = new FlaskStorageAdapter(url)
      const connected = await adapter.testConnection()
      setFlaskConnectionStatus(connected ? 'connected' : 'failed')
      return connected
    } catch (error) {
      console.error('Connection test failed:', error)
      setFlaskConnectionStatus('failed')
      return false
    } finally {
      setTestingConnection(false)
    }
  }, [])

  const loadConfig = useCallback(() => {
    const config = loadStorageConfig()
    const envFlaskUrl = process.env.NEXT_PUBLIC_FLASK_BACKEND_URL
    const isEnvSet = Boolean(envFlaskUrl)
    
    setEnvVarSet(isEnvSet)
    setStorageBackend(config.backend)
    setFlaskUrl(config.flaskUrl || envFlaskUrl || 'http://localhost:5000')
  }, [])

  const handleTestConnection = useCallback(async () => {
    await testFlaskConnection(flaskUrl)
  }, [flaskUrl, testFlaskConnection])

  const handleSaveStorageConfig = useCallback(async (onSuccess?: () => Promise<void>) => {
    if (storageBackend === 'flask') {
      if (!flaskUrl) {
        toast.error(t.settings.enterFlaskUrl)
        return
      }

      const connected = await testFlaskConnection(flaskUrl)
      if (!connected) {
        toast.error(t.settings.storage.cannotConnect)
        return
      }
    }

    saveStorageConfig({
      backend: storageBackend,
      flaskUrl: storageBackend === 'flask' ? flaskUrl : undefined
    })

    toast.success(t.settings.storage.backendUpdated)
    
    if (onSuccess) {
      await onSuccess()
    }
  }, [storageBackend, flaskUrl, testFlaskConnection])

  return {
    storageBackend,
    setStorageBackend,
    flaskUrl,
    setFlaskUrl,
    flaskConnectionStatus,
    setFlaskConnectionStatus,
    testingConnection,
    envVarSet,
    loadConfig,
    testFlaskConnection,
    handleTestConnection,
    handleSaveStorageConfig,
  }
}
