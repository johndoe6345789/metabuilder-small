'use client';

import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { Alert, AlertTitle } from '@metabuilder/components/fakemui'
import { getStorageConfig } from '@/lib/storage'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * Small stack of status alerts to keep tests and users informed about
 * the current storage mode and backend connectivity.
 */
export function AppStatusAlerts() {
  const t = useTranslation()
  const { backend } = getStorageConfig()
  const usingLocal = backend === 'indexeddb'

  return (
    <div className="space-y-2" data-testid="status-alerts" role="region" aria-label="Application status alerts">
      <Alert
        data-testid="alert-success"
        className="alert-m3-success"
        role="status"
        aria-live="polite"
        severity="success"
        icon={<CheckCircle className="col-start-1 mt-0.5 text-emerald-500" weight="fill" aria-hidden="true" />}
      >
        <AlertTitle>{t.statusAlerts.workspaceReady}</AlertTitle>
        {usingLocal ? t.statusAlerts.localModeDesc : t.statusAlerts.connectedDesc}
      </Alert>

      {usingLocal && (
        <Alert
          data-testid="alert-error"
          className="alert-m3-error"
          role="alert"
          aria-live="assertive"
          severity="error"
          icon={<WarningCircle className="col-start-1 mt-0.5" weight="fill" aria-hidden="true" />}
        >
          <AlertTitle>{t.statusAlerts.cloudUnavailable}</AlertTitle>
          {t.statusAlerts.cloudUnavailableDesc}
        </Alert>
      )}
    </div>
  )
}
