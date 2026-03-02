'use client'

import { Card, CardHeader, CardContent, Button, Alert, AlertDescription } from '@metabuilder/components/fakemui'
import { Warning, FirstAid, CheckCircle } from '@phosphor-icons/react'
import { useTranslation } from '@/hooks/useTranslation'
import styles from './settings-card.module.scss'

interface SchemaHealthCardProps {
  schemaHealth: 'unknown' | 'healthy' | 'corrupted'
  checkingSchema: boolean
  onClear: () => Promise<void>
  onCheckSchema: () => Promise<void>
}

export function SchemaHealthCard({
  schemaHealth,
  checkingSchema,
  onClear,
  onCheckSchema
}: SchemaHealthCardProps) {
  const t = useTranslation()
  const s = t.settingsCards.schema

  if (schemaHealth === 'unknown') return null

  if (schemaHealth === 'corrupted') {
    return (
      <Card data-testid="schema-corrupted-card" role="alert" aria-label="Database schema corruption alert">
        <CardHeader>
          <h3 className={styles.cardTitleDestructive}>
            <Warning weight="fill" size={24} aria-hidden="true" />
            {s.corruptedTitle}
          </h3>
          <p className={styles.cardDescription}>
            {s.corruptedDesc}
          </p>
        </CardHeader>
        <CardContent>
          <div className={styles.contentStackSm}>
            <Alert severity="info" role="alert" data-testid="schema-error-details">
              <AlertDescription>
                {s.corruptedAlert}
              </AlertDescription>
            </Alert>
            <div className={styles.schemaRepairActions} data-testid="schema-repair-actions">
              <Button onClick={onClear} variant="danger" className={styles.btnWithIcon} data-testid="repair-database-btn" aria-label="Repair database (wipe and recreate)">
                <FirstAid weight="bold" size={16} aria-hidden="true" />
                {s.repairButton}
              </Button>
              <Button onClick={onCheckSchema} variant="outlined" disabled={checkingSchema} data-testid="recheck-schema-btn" aria-label="Re-check schema status" aria-busy={checkingSchema}>
                {checkingSchema ? s.checking : s.recheckButton}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="schema-healthy-card" role="status" aria-label="Database schema health check passed">
      <CardHeader>
        <h3 className={styles.cardTitleGreen}>
          <CheckCircle weight="fill" size={24} aria-hidden="true" />
          {s.healthyTitle}
        </h3>
        <p className={styles.cardDescription}>
          {s.healthyDesc}
        </p>
      </CardHeader>
    </Card>
  )
}
