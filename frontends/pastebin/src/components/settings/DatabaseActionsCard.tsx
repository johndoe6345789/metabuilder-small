'use client'

import { useRef } from 'react'
import { Card, CardHeader, CardContent, Button } from '@metabuilder/components/fakemui'
import { Database, Download, Upload, Trash } from '@phosphor-icons/react'
import { useTranslation } from '@/hooks/useTranslation'
import styles from './settings-card.module.scss'

interface DatabaseActionsCardProps {
  onExport: () => Promise<void>
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onSeed: () => Promise<void>
  onClear: () => Promise<void>
}

export function DatabaseActionsCard({
  onExport,
  onImport,
  onSeed,
  onClear
}: DatabaseActionsCardProps) {
  const t = useTranslation()
  const s = t.settingsCards.actions
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card data-testid="database-actions-card">
      <CardHeader>
        <h3 className={styles.cardTitle}>{s.title}</h3>
        <p className={styles.cardDescription}>
          {s.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div data-testid="export-section">
          <h3 className="text-sm font-semibold mb-2">{s.exportTitle}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {s.exportDesc}
          </p>
          <Button onClick={onExport} variant="outlined" className="gap-2" data-testid="export-db-btn" aria-label="Export database as file">
            <Download weight="bold" size={16} aria-hidden="true" />
            {s.exportButton}
          </Button>
        </div>

        <div className="pt-4 border-t border-border" data-testid="import-section">
          <h3 className="text-sm font-semibold mb-2">{s.importTitle}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {s.importDesc}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".db"
            onChange={onImport}
            className="hidden"
            id="import-db"
            data-testid="import-file-input"
            aria-label="Import database file"
          />
          <Button
            variant="outlined"
            className="gap-2"
            data-testid="import-db-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import database file"
          >
            <Upload weight="bold" size={16} aria-hidden="true" />
            {s.importButton}
          </Button>
        </div>

        <div className="pt-4 border-t border-border" data-testid="seed-section">
          <h3 className="text-sm font-semibold mb-2">{s.seedTitle}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {s.seedDesc}
          </p>
          <Button onClick={onSeed} variant="outlined" className="gap-2" data-testid="seed-db-btn" aria-label="Add sample data to database">
            <Database weight="bold" size={16} aria-hidden="true" />
            {s.seedButton}
          </Button>
        </div>

        <div className="pt-4 border-t border-border" data-testid="clear-section">
          <h3 className="text-sm font-semibold mb-2 text-destructive">{s.clearTitle}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {s.clearDesc}
          </p>
          <Button onClick={onClear} variant="danger" className="gap-2" data-testid="clear-db-btn" aria-label="Permanently delete all database contents">
            <Trash weight="bold" size={16} aria-hidden="true" />
            {s.clearButton}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
