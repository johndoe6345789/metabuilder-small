'use client'

import { useEffect } from 'react'
import { Plus } from '@phosphor-icons/react'
import { Menu, MenuItem, Divider } from '@metabuilder/components/fakemui'
import { SnippetTemplate } from '@/lib/types'
import styles from './template-picker.module.scss'

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
      className={styles.menu}
      data-testid={testId}
    >
      <MenuItem onClick={() => { onCreateNew(); onClose() }}>
        <Plus className="mr-2 h-4 w-4" weight="bold" aria-hidden="true" />
        Blank Snippet
      </MenuItem>
      {sections.map((section) => (
        <div key={section.label}>
          <Divider />
          <div className={styles.sectionHeader} aria-hidden="true">{section.label}</div>
          <div className={styles.grid} role="group" aria-label={section.label}>
            {section.templates.map(template => (
              <button
                key={template.id}
                role="menuitem"
                onClick={() => { onCreateFromTemplate(template.id); onClose() }}
                className={styles.card}
              >
                <span className={styles.cardTitle}>
                  {template.title}
                </span>
                <span className={styles.cardDescription}>
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
