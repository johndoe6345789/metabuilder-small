import { Card } from '@metabuilder/components/fakemui'
import {
  Heart,
  Star,
  Lightning,
  Check,
  X,
  Plus,
  Minus,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import styles from './IconsSection.module.scss'

export function IconsSection() {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} data-testid="icons-section" role="region" aria-label="Icon gallery">
      <div>
        <h2 style={{ fontSize: '1.875rem', lineHeight: '2.25rem', fontWeight: 700, marginBottom: '8px' }}>Icons</h2>
        <p style={{ color: 'var(--mat-sys-on-surface-variant)' }}>
          Phosphor icon set with multiple weights
        </p>
      </div>

      <Card className="p-6">
        <div className={styles.iconsGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Heart style={{ width: '32px', height: '32px' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--mat-sys-on-surface-variant)' }}>Heart</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Star style={{ width: '32px', height: '32px' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--mat-sys-on-surface-variant)' }}>Star</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Lightning style={{ width: '32px', height: '32px' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--mat-sys-on-surface-variant)' }}>Lightning</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Check style={{ width: '32px', height: '32px' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--mat-sys-on-surface-variant)' }}>Check</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <X style={{ width: '32px', height: '32px' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--mat-sys-on-surface-variant)' }}>X</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Plus style={{ width: '32px', height: '32px' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--mat-sys-on-surface-variant)' }}>Plus</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Minus style={{ width: '32px', height: '32px' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--mat-sys-on-surface-variant)' }}>Minus</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <MagnifyingGlass style={{ width: '32px', height: '32px' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--mat-sys-on-surface-variant)' }}>Search</span>
          </div>
        </div>
      </Card>
    </section>
  )
}
