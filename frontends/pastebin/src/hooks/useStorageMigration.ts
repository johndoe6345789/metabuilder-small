import { useCallback } from 'react'
import { toast } from 'sonner'
import { getAllSnippets } from '@/lib/db'
import {
  saveStorageConfig,
  FlaskStorageAdapter
} from '@/lib/storage'
import { useTranslation } from '@/hooks/useTranslation'

export function useStorageMigration() {
  const t = useTranslation()

  const handleMigrateToFlask = useCallback(async (flaskUrl: string, onSuccess?: () => Promise<void>) => {
    if (!flaskUrl) {
      toast.error(t.settings.enterFlaskUrl)
      return
    }

    try {
      const adapter = new FlaskStorageAdapter(flaskUrl)
      const connected = await adapter.testConnection()

      if (!connected) {
        toast.error(t.settings.migration.cannotConnect)
        return
      }

      const snippets = await getAllSnippets()

      if (snippets.length === 0) {
        toast.info(t.settings.migration.noSnippets)
        return
      }

      await adapter.migrateFromIndexedDB(snippets)

      saveStorageConfig({
        backend: 'flask',
        flaskUrl
      })

      toast.success(t.settings.migration.migratedToFlask.replace('{count}', String(snippets.length)))

      if (onSuccess) {
        await onSuccess()
      }
    } catch (error) {
      console.error('Migration failed:', error)
      toast.error(t.settings.migration.failedToFlask)
    }
  }, [])

  const handleMigrateToIndexedDB = useCallback(async (flaskUrl: string) => {
    if (!flaskUrl) {
      toast.error(t.settings.enterFlaskUrl)
      return
    }

    try {
      const adapter = new FlaskStorageAdapter(flaskUrl)
      const snippets = await adapter.migrateToIndexedDB()

      if (snippets.length === 0) {
        toast.info(t.settings.migration.noSnippets)
        return
      }

      saveStorageConfig({
        backend: 'indexeddb'
      })

      // Full page reload is necessary here to reinitialize the database layer
      // with the new backend after migration from Flask to IndexedDB
      window.location.reload()

      toast.success(t.settings.migration.migratedToIndexedDB.replace('{count}', String(snippets.length)))
    } catch (error) {
      console.error('Migration failed:', error)
      toast.error(t.settings.migration.failedFromFlask)
    }
  }, [])

  return {
    handleMigrateToFlask,
    handleMigrateToIndexedDB,
  }
}
