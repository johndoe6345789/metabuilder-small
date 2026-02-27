'use client'

import { useEffect } from 'react'
import { Plus } from '@phosphor-icons/react'
import { Menu, MenuItem, Divider } from '@metabuilder/components/fakemui'
import { SnippetTemplate } from '@/lib/types'

export interface TemplateSection {
  label: string
  templates: SnippetTemplate[]
}

export interface TemplatePickerProps {
  anchor: HTMLElement | null
  onClose: () => void
  onCreateNew: () => void
  onCreateFromTemplate: (id: string) => void
  sections: TemplateSection[]
  'data-testid'?: string
}

const SECTION_HEADER: React.CSSProperties = {
  padding: '10px 16px 4px',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--mat-sys-on-surface-variant)',
}

const GRID: React.CSSProperties = {
  display: 'grid',
  // 180px min gives responsive cols: ~3 cols ≥580px viewport, 2 cols 400–580px, 1 col <400px
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '6px',
  padding: '4px 8px 8px',
}

const CARD: React.CSSProperties = {
  padding: '8px 10px',
  background: 'none',
  border: '1px solid var(--mat-sys-outline-variant)',
  borderRadius: '6px',
  cursor: 'pointer',
  textAlign: 'left',
  color: 'var(--mat-sys-on-surface)',
  transition: 'background-color 150ms',
  width: '100%',
}

export function TemplatePicker({
  anchor,
  onClose,
  onCreateNew,
  onCreateFromTemplate,
  sections,
  'data-testid': testId,
}: TemplatePickerProps) {
  // Menu position is calculated once at open-time; close on resize so it re-anchors correctly
  useEffect(() => {
    if (!anchor) return
    const handleResize = () => onClose()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [anchor, onClose])

  return (
    <Menu
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      // width:calc drives responsiveness; maxWidth caps on large screens;
      // both inline styles override CSS class max-width: 280px
      style={{ width: 'calc(100vw - 24px)', maxWidth: '620px', maxHeight: '75vh' }}
      data-testid={testId}
    >
      <MenuItem onClick={() => { onCreateNew(); onClose() }}>
        <Plus className="mr-2 h-4 w-4" weight="bold" aria-hidden="true" />
        Blank Snippet
      </MenuItem>
      {sections.map((section) => (
        <div key={section.label}>
          <Divider />
          <div style={SECTION_HEADER} aria-hidden="true">{section.label}</div>
          <div style={GRID} role="group" aria-label={section.label}>
            {section.templates.map(template => (
              <button
                key={template.id}
                role="menuitem"
                onClick={() => { onCreateFromTemplate(template.id); onClose() }}
                style={CARD}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--mat-sys-surface-container-high)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <span style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', marginBottom: 2 }}>
                  {template.title}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--mat-sys-on-surface-variant)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </Menu>
  )
}
