import { useState } from 'react'
import { Code, CaretDown } from '@phosphor-icons/react'
import { Button } from '@metabuilder/components/fakemui'
import { strings } from '@/lib/config'
import { SnippetTemplate } from '@/lib/types'
import templatesData from '@/data/templates.json'
import { TemplatePicker } from '@/components/features/snippet-editor/TemplatePicker'

const templates = templatesData as SnippetTemplate[]

interface EmptyStateProps {
  onCreateClick: () => void
  onCreateFromTemplate?: (templateId: string) => void
}

export function EmptyState({ onCreateClick, onCreateFromTemplate }: EmptyStateProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
      data-testid="empty-state"
      role="status"
      aria-live="polite"
      aria-label="No snippets available"
    >
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="empty-state-message"
      >
        {strings.emptyState.title}. {strings.emptyState.description}
      </div>

      <div style={{ width: 96, height: 96, borderRadius: '50%', backgroundColor: 'var(--mat-sys-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }} aria-hidden="true">
        <Code style={{ width: 48, height: 48, color: 'var(--mat-sys-on-primary-container)' }} weight="duotone" />
      </div>
      <h2 style={{ fontFamily: 'var(--mat-sys-headline-small-font)', fontSize: '1.5rem', fontWeight: 600, marginBottom: 8, color: 'var(--mat-sys-on-surface)' }}>{strings.emptyState.title}</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        {strings.emptyState.description}
      </p>
      <Button
        size="lg"
        className="gap-2"
        data-testid="empty-state-create-menu"
        aria-label="Create new snippet from templates"
        aria-haspopup="menu"
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        <Code className="h-5 w-5" weight="bold" aria-hidden="true" />
        {strings.emptyState.buttonText}
        <CaretDown weight="bold" aria-hidden="true" />
      </Button>
      <TemplatePicker
        anchor={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        onCreateNew={onCreateClick}
        onCreateFromTemplate={(id) => { onCreateFromTemplate?.(id) }}
        data-testid="empty-state-menu-content"
        sections={[
          { label: 'React Components', templates: templates.filter(t => t.category === 'react') },
          { label: 'JavaScript / TypeScript', templates: templates.filter(t => ['api', 'basics', 'async', 'types'].includes(t.category)) },
          { label: 'CSS Layouts', templates: templates.filter(t => t.category === 'layout') },
          { label: 'Python — Project Euler', templates: templates.filter(t => t.category === 'euler') },
          { label: 'Python — Algorithms', templates: templates.filter(t => t.category === 'algorithms' && t.language === 'Python') },
          { label: 'Python — Interactive', templates: templates.filter(t => t.category === 'interactive') },
        ]}
      />
    </div>
  )
}
