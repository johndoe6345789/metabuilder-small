'use client'

import { Card, CardContent, CardHeader, Button } from '@metabuilder/components/fakemui'
import { CloudCheck, CloudSlash } from '@phosphor-icons/react'
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
    <Card className="border-accent" data-testid="backend-auto-config-card">
      <CardHeader>
        <h3 className={`${styles.cardTitle} flex items-center gap-2 text-accent`}>
          <CloudCheck weight="fill" size={24} aria-hidden="true" />
          {s.title}
        </h3>
        <p className={styles.cardDescription}>
          {s.description}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2" data-testid="backend-url">
            <span className="text-sm text-muted-foreground">{s.backendUrl}</span>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{flaskUrl}</code>
          </div>
          <div className="flex items-center justify-between py-2" data-testid="config-source">
            <span className="text-sm text-muted-foreground">{s.configSource}</span>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">NEXT_PUBLIC_FLASK_BACKEND_URL</code>
          </div>
          <div className="flex items-center justify-between py-2" data-testid="connection-status">
            <span className="text-sm text-muted-foreground">{s.status}</span>
            {flaskConnectionStatus === 'connected' && (
              <span className="flex items-center gap-2 text-sm text-green-600">
                <CloudCheck weight="fill" size={16} aria-hidden="true" />
                {s.connected}
              </span>
            )}
            {flaskConnectionStatus === 'failed' && (
              <span className="flex items-center gap-2 text-sm text-destructive">
                <CloudSlash weight="fill" size={16} aria-hidden="true" />
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
