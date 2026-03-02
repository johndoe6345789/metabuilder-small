'use client'

import { Card, CardContent, CardHeader, Chip, MaterialIcon } from '@metabuilder/components/fakemui'
import styles from './PersistenceSettings.module.scss'

const PERSIST_CONFIG = {
  key: 'pastebin',
  storage: 'IndexedDB',
  whitelist: ['snippets', 'namespaces', 'ui'],
  throttle: 100,
}

export function PersistenceSettings() {
  return (
    <Card data-testid="persistence-settings">
      <CardHeader>
        <div className={styles.headerRow}>
          <div className={styles.iconWrap} aria-hidden="true">
            <MaterialIcon name="save" className={styles.headerIcon} />
          </div>
          <div>
            <h3 style={{fontWeight:600, marginBottom:'2px'}}>Redux Persistence</h3>
            <p style={{color:'var(--mat-sys-on-surface-variant)',fontSize:'0.875rem'}}>
              Automatic IndexedDB persistence via @metabuilder/redux-persist
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={styles.cardBody}>
          <div className={styles.configGrid} data-testid="persist-config-section">
            <div data-testid="persist-key-stat">
              <div className={styles.label}>Persist Key</div>
              <div className={styles.valueMono}>{PERSIST_CONFIG.key}</div>
            </div>
            <div data-testid="persist-storage-stat">
              <div className={styles.label}>Storage Backend</div>
              <div className={styles.value}>{PERSIST_CONFIG.storage}</div>
            </div>
            <div data-testid="persist-throttle-stat">
              <div className={styles.label}>Throttle</div>
              <div className={styles.value}>{PERSIST_CONFIG.throttle}ms</div>
            </div>
            <div data-testid="persist-slices-count-stat">
              <div className={styles.label}>Persisted Slices</div>
              <div className={styles.value}>{PERSIST_CONFIG.whitelist.length}</div>
            </div>
          </div>

          <div className={styles.slicesSection} data-testid="persisted-slices-section" role="region" aria-label="Persisted slices">
            <div className={styles.slicesHeader}>
              <span className={styles.slicesHeaderLabel}>Persisted Slices</span>
              <Chip data-testid="slices-count">{PERSIST_CONFIG.whitelist.length}</Chip>
            </div>
            <div className={styles.chipList}>
              {PERSIST_CONFIG.whitelist.map((slice) => (
                <Chip key={slice} variant="outlined" className={styles.chipMono} data-testid={`slice-badge-${slice}`}>
                  {slice}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
