'use client'

import { Card, CardContent, CardHeader, Button, MaterialIcon } from '@metabuilder/components/fakemui'
import { useTranslation } from '@/hooks/useTranslation'
import styles from './settings-card.module.scss'

interface BackendAutoConfigCardProps {
  envVarSet: boolean
  flaskUrl: string
  flaskConnectionStatus: 'unknown' | 'connected' | 'failed'
  testingConnection: boolean
  onTestConnection: () => Promise<void>
}

export function BackendAutoConfigCard({
  envVarSet,
  flaskUrl,
  flaskConnectionStatus,
  testingConnection,
  onTestConnection
}: BackendAutoConfigCardProps) {
  const t = useTranslation()
  const s = t.settingsCards.backendAuto

  if (!envVarSet) return null

  return (
    <Card data-testid="backend-auto-config-card">
      <CardHeader>
        <h3 className={styles.cardTitleAccent}>
          <MaterialIcon name="cloud_done" size={24} aria-hidden="true" />
          {s.title}
        </h3>
        <p className={styles.cardDescription}>
          {s.description}
        </p>
      </CardHeader>
      <CardContent>
        <div className={styles.infoStack}>
          <div className={styles.infoRow} data-testid="backend-url">
            <span className={styles.infoLabel}>{s.backendUrl}</span>
            <code className={styles.infoCode}>{flaskUrl}</code>
          </div>
          <div className={styles.infoRow} data-testid="config-source">
            <span className={styles.infoLabel}>{s.configSource}</span>
            <code className={styles.infoCode}>NEXT_PUBLIC_FLASK_BACKEND_URL</code>
          </div>
          <div className={styles.infoRow} data-testid="connection-status">
            <span className={styles.infoLabel}>{s.status}</span>
            {flaskConnectionStatus === 'connected' && (
              <span className={styles.statusConnected}>
                <MaterialIcon name="cloud_done" size={16} aria-hidden="true" />
                {s.connected}
              </span>
            )}
            {flaskConnectionStatus === 'failed' && (
              <span className={styles.statusFailed}>
                <MaterialIcon name="cloud_off" size={16} aria-hidden="true" />
                {s.failed}
              </span>
            )}
            {flaskConnectionStatus === 'unknown' && (
              <Button
                onClick={onTestConnection}
                variant="outlined"
                size="sm"
                disabled={testingConnection}
                data-testid="test-connection-btn"
                aria-label="Test backend connection"
                aria-busy={testingConnection}
              >
                {testingConnection ? s.testing : s.testButton}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
