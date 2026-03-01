'use client'

import { Card, CardHeader, CardContent } from '@metabuilder/components/fakemui'
import { Database } from '@phosphor-icons/react'
import { useTranslation } from '@/hooks/useTranslation'
import styles from './settings-card.module.scss'

interface DatabaseStatsCardProps {
  loading: boolean
  stats: {
    snippetCount: number
    templateCount: number
    storageType: 'indexeddb' | 'localstorage' | 'none'
    databaseSize: number
  } | null
  formatBytes: (bytes: number) => string
}

export function DatabaseStatsCard({ loading, stats, formatBytes }: DatabaseStatsCardProps) {
  const t = useTranslation()
  const s = t.settingsCards.stats
  return (
    <Card data-testid="database-stats-card">
      <CardHeader>
        <h3 className={`${styles.cardTitle} flex items-center gap-2`}>
          <Database weight="duotone" size={24} aria-hidden="true" />
          {s.title}
        </h3>
        <p className={styles.cardDescription}>
          {s.description}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground" data-testid="stats-loading" role="status" aria-busy="true">{s.loading}</p>
        ) : stats ? (
          <div className="space-y-3" role="region" aria-label="Database statistics">
            <div className="flex justify-between items-center py-2 border-b border-border" data-testid="stat-snippets">
              <span className="text-sm text-muted-foreground">{s.snippets}</span>
              <span className="font-semibold">{stats.snippetCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border" data-testid="stat-templates">
              <span className="text-sm text-muted-foreground">{s.templates}</span>
              <span className="font-semibold">{stats.templateCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border" data-testid="stat-storage-type">
              <span className="text-sm text-muted-foreground">{s.storageType}</span>
              <span className="font-semibold capitalize">{stats.storageType}</span>
            </div>
            <div className="flex justify-between items-center py-2" data-testid="stat-database-size">
              <span className="text-sm text-muted-foreground">{s.databaseSize}</span>
              <span className="font-semibold">{formatBytes(stats.databaseSize)}</span>
            </div>
          </div>
        ) : (
          <p className="text-destructive" data-testid="stats-error" role="alert">{s.error}</p>
        )}
      </CardContent>
    </Card>
  )
}
