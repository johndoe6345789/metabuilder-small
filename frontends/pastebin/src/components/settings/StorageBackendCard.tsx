'use client'

import { Card, CardHeader, CardContent, Button, Input, FormLabel, Alert, AlertDescription, RadioGroup, Radio, FormControlLabel, MaterialIcon } from '@metabuilder/components/fakemui'
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
        <h3 className={styles.cardTitleWithIcon}>
          <MaterialIcon name="cloud_upload" size={24} aria-hidden="true" />
          {s.title}
        </h3>
        <p className={styles.cardDescription}>
          {s.description}
        </p>
      </CardHeader>
      <CardContent>
        <div className={styles.contentStack}>
          {envVarSet && (
            <Alert severity="info" className={styles.alertAccent} data-testid="env-var-alert" role="status">
              <AlertDescription className={styles.alertAccentDescription}>
                <MaterialIcon name="cloud_done" size={16} aria-hidden="true" />
                <span>
                  {s.envVarAlertBefore} <code className={styles.envVarCode}>NEXT_PUBLIC_FLASK_BACKEND_URL</code> {s.envVarAlertAfter}
                </span>
              </AlertDescription>
            </Alert>
          )}

          <RadioGroup
            value={storageBackend}
            onChange={(e) => onStorageBackendChange(e.target.value as StorageBackend)}
          >
            <div className={styles.radioOptionRow} data-testid="storage-option-indexeddb">
              <FormControlLabel
                value="indexeddb"
                control={<Radio id="storage-indexeddb" disabled={envVarSet} />}
                label={
                  <div className={styles.radioOptionContent}>
                    <FormLabel
                      htmlFor="storage-indexeddb"
                      className={envVarSet ? styles.radioOptionLabelDisabled : styles.radioOptionLabel}
                    >
                      {s.indexedDBLabel}
                    </FormLabel>
                    <p className={styles.radioOptionDesc}>
                      {s.indexedDBDesc}
                    </p>
                  </div>
                }
              />
            </div>

            <div className={styles.radioOptionRowMarginTop} data-testid="storage-option-flask">
              <FormControlLabel
                value="flask"
                control={<Radio id="storage-flask" disabled={envVarSet} />}
                label={
                  <div className={styles.radioOptionContent}>
                    <FormLabel
                      htmlFor="storage-flask"
                      className={envVarSet ? styles.radioOptionLabelDisabled : styles.radioOptionLabel}
                    >
                      {s.flaskLabel}
                    </FormLabel>
                    <p className={styles.radioOptionDesc}>
                      {s.flaskDesc}
                    </p>
                  </div>
                }
              />
            </div>
          </RadioGroup>

          {storageBackend === 'flask' && (
            <div className={styles.flaskConfigSection} data-testid="flask-config-section">
              <div>
                <FormLabel htmlFor="flask-url">{s.urlLabel}</FormLabel>
                <div className={styles.flaskUrlRow}>
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
                  <div className={styles.flaskStatusConnected} data-testid="flask-connected-status">
                    <MaterialIcon name="cloud_done" size={16} aria-hidden="true" />
                    {s.connectedStatus}
                  </div>
                )}
                {flaskConnectionStatus === 'failed' && (
                  <div className={styles.flaskStatusFailed} data-testid="flask-failed-status">
                    <MaterialIcon name="cloud_off" size={16} aria-hidden="true" />
                    {s.failedStatus}
                  </div>
                )}
              </div>

              <div className={styles.flaskMigrateSection}>
                <Button
                  onClick={onMigrateToFlask}
                  variant="outlined"
                  size="sm"
                  className={styles.btnFullWidth}
                  data-testid="migrate-to-flask-btn"
                  aria-label="Migrate IndexedDB data to Flask backend"
                >
                  <MaterialIcon name="upload" size={16} aria-hidden="true" />
                  {s.migrateToFlask}
                </Button>
                <Button
                  onClick={onMigrateToIndexedDB}
                  variant="outlined"
                  size="sm"
                  className={styles.btnFullWidth}
                  data-testid="migrate-to-indexeddb-btn"
                  aria-label="Migrate Flask data to IndexedDB"
                >
                  <MaterialIcon name="download" size={16} aria-hidden="true" />
                  {s.migrateToIndexedDB}
                </Button>
              </div>
            </div>
          )}

          <div className={styles.saveBtnRow}>
            <Button
              onClick={onSaveConfig}
              className={styles.btnWithIcon}
              disabled={envVarSet}
              data-testid="save-storage-settings-btn"
              aria-label="Save storage configuration"
            >
              <MaterialIcon name="storage" size={16} aria-hidden="true" />
              {s.save}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
