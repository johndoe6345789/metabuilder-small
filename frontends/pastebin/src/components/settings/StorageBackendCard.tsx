'use client'

import { Card, CardHeader, CardContent, Button, Input, FormLabel, Alert, AlertDescription, RadioGroup, Radio, FormControlLabel } from '@metabuilder/components/fakemui'
import { Database, CloudArrowUp, CloudCheck, CloudSlash, Upload, Download } from '@phosphor-icons/react'
import { type StorageBackend } from '@/lib/storage'
import { useTranslation } from '@/hooks/useTranslation'
import styles from './settings-card.module.scss'

interface StorageBackendCardProps {
  storageBackend: StorageBackend
  flaskUrl: string
  flaskConnectionStatus: 'unknown' | 'connected' | 'failed'
  testingConnection: boolean
  envVarSet: boolean
  onStorageBackendChange: (backend: StorageBackend) => void
  onFlaskUrlChange: (url: string) => void
  onTestConnection: () => Promise<void>
  onSaveConfig: () => Promise<void>
  onMigrateToFlask: () => Promise<void>
  onMigrateToIndexedDB: () => Promise<void>
}

export function StorageBackendCard({
  storageBackend,
  flaskUrl,
  flaskConnectionStatus,
  testingConnection,
  envVarSet,
  onStorageBackendChange,
  onFlaskUrlChange,
  onTestConnection,
  onSaveConfig,
  onMigrateToFlask,
  onMigrateToIndexedDB,
}: StorageBackendCardProps) {
  const t = useTranslation()
  const s = t.settingsCards.storage
  return (
    <Card data-testid="storage-backend-card">
      <CardHeader>
        <h3 className={`${styles.cardTitle} flex items-center gap-2`}>
          <CloudArrowUp weight="duotone" size={24} aria-hidden="true" />
          {s.title}
        </h3>
        <p className={styles.cardDescription}>
          {s.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {envVarSet && (
          <Alert severity="info" className="border-accent bg-accent/10" data-testid="env-var-alert" role="status">
            <AlertDescription className="flex items-center gap-2">
              <CloudCheck weight="fill" size={16} className="text-accent" aria-hidden="true" />
              <span>
                {s.envVarAlertBefore} <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">NEXT_PUBLIC_FLASK_BACKEND_URL</code> {s.envVarAlertAfter}
              </span>
            </AlertDescription>
          </Alert>
        )}

        <RadioGroup
          value={storageBackend}
          onChange={(e) => onStorageBackendChange(e.target.value as StorageBackend)}
        >
          <div className="flex items-start space-x-3 space-y-0" data-testid="storage-option-indexeddb">
            <FormControlLabel
              value="indexeddb"
              control={<Radio id="storage-indexeddb" disabled={envVarSet} />}
              label={
                <div className="flex-1">
                  <FormLabel htmlFor="storage-indexeddb" className={`font-semibold ${envVarSet ? 'opacity-50' : 'cursor-pointer'}`}>
                    {s.indexedDBLabel}
                  </FormLabel>
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.indexedDBDesc}
                  </p>
                </div>
              }
            />
          </div>

          <div className="flex items-start space-x-3 space-y-0 mt-4" data-testid="storage-option-flask">
            <FormControlLabel
              value="flask"
              control={<Radio id="storage-flask" disabled={envVarSet} />}
              label={
                <div className="flex-1">
                  <FormLabel htmlFor="storage-flask" className={`font-semibold ${envVarSet ? 'opacity-50' : 'cursor-pointer'}`}>
                    {s.flaskLabel}
                  </FormLabel>
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.flaskDesc}
                  </p>
                </div>
              }
            />
          </div>
        </RadioGroup>

        {storageBackend === 'flask' && (
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/50" data-testid="flask-config-section">
            <div>
              <FormLabel htmlFor="flask-url">{s.urlLabel}</FormLabel>
              <div className="flex gap-2 mt-2">
                <Input
                  id="flask-url"
                  type="url"
                  placeholder={s.urlPlaceholder}
                  value={flaskUrl}
                  onChange={(e) => onFlaskUrlChange(e.target.value)}
                  disabled={envVarSet}
                  data-testid="flask-url-input"
                  aria-label="Flask backend URL"
                />
                <Button
                  onClick={onTestConnection}
                  variant="outlined"
                  disabled={testingConnection || !flaskUrl}
                  data-testid="test-flask-btn"
                  aria-label="Test flask connection"
                  aria-busy={testingConnection}
                >
                  {testingConnection ? s.testing : s.test}
                </Button>
              </div>
              {flaskConnectionStatus === 'connected' && (
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600" data-testid="flask-connected-status">
                  <CloudCheck weight="fill" size={16} aria-hidden="true" />
                  {s.connectedStatus}
                </div>
              )}
              {flaskConnectionStatus === 'failed' && (
                <div className="flex items-center gap-2 mt-2 text-sm text-destructive" data-testid="flask-failed-status">
                  <CloudSlash weight="fill" size={16} aria-hidden="true" />
                  {s.failedStatus}
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <Button
                onClick={onMigrateToFlask}
                variant="outlined"
                size="sm"
                className="w-full gap-2"
                data-testid="migrate-to-flask-btn"
                aria-label="Migrate IndexedDB data to Flask backend"
              >
                <Upload weight="bold" size={16} aria-hidden="true" />
                {s.migrateToFlask}
              </Button>
              <Button
                onClick={onMigrateToIndexedDB}
                variant="outlined"
                size="sm"
                className="w-full gap-2"
                data-testid="migrate-to-indexeddb-btn"
                aria-label="Migrate Flask data to IndexedDB"
              >
                <Download weight="bold" size={16} aria-hidden="true" />
                {s.migrateToIndexedDB}
              </Button>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button onClick={onSaveConfig} className="gap-2" disabled={envVarSet} data-testid="save-storage-settings-btn" aria-label="Save storage configuration">
            <Database weight="bold" size={16} aria-hidden="true" />
            {s.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
