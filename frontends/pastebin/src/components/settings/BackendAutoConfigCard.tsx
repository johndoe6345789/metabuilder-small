'use client'

import { Card, CardContent, CardHeader, Button } from '@metabuilder/components/fakemui'
import { CloudCheck, CloudSlash } from '@phosphor-icons/react'

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
  if (!envVarSet) return null

  return (
    <Card className="border-accent" data-testid="backend-auto-config-card">
      <CardHeader>
        <h3 style={{fontWeight:600, marginBottom:'4px'}} className="flex items-center gap-2 text-accent">
          <CloudCheck weight="fill" size={24} aria-hidden="true" />
          Backend Auto-Configured
        </h3>
        <p style={{color:'var(--mat-sys-on-surface-variant)',fontSize:'0.875rem',marginBottom:'8px'}}>
          Flask backend is configured via environment variable
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2" data-testid="backend-url">
            <span className="text-sm text-muted-foreground">Backend URL</span>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{flaskUrl}</code>
          </div>
          <div className="flex items-center justify-between py-2" data-testid="config-source">
            <span className="text-sm text-muted-foreground">Configuration Source</span>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">NEXT_PUBLIC_FLASK_BACKEND_URL</code>
          </div>
          <div className="flex items-center justify-between py-2" data-testid="connection-status">
            <span className="text-sm text-muted-foreground">Status</span>
            {flaskConnectionStatus === 'connected' && (
              <span className="flex items-center gap-2 text-sm text-green-600">
                <CloudCheck weight="fill" size={16} aria-hidden="true" />
                Connected
              </span>
            )}
            {flaskConnectionStatus === 'failed' && (
              <span className="flex items-center gap-2 text-sm text-destructive">
                <CloudSlash weight="fill" size={16} aria-hidden="true" />
                Connection Failed
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
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
