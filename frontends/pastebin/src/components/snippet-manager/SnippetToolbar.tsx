import { useState, useEffect, useRef } from 'react'
import { Button, Input } from '@metabuilder/components/fakemui'
import { Plus, MagnifyingGlass, CaretDown, CheckSquare, X } from '@phosphor-icons/react'
import { strings } from '@/lib/config'
import { SnippetTemplate } from '@/lib/types'
import { TemplatePicker } from '@/components/features/snippet-editor/TemplatePicker'

interface SnippetToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
  onCreateNew: () => void
  onCreateFromTemplate: (templateId: string) => void
  templates: SnippetTemplate[]
}

export function SnippetToolbar({
  searchQuery,
  onSearchChange,
  selectionMode,
  onToggleSelectionMode,
  onCreateNew,
  onCreateFromTemplate,
  templates,
}: SnippetToolbarProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [inputValue, setInputValue] = useState(searchQuery)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  const handleSearchInput = (value: string) => {
    setInputValue(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => onSearchChange(value), 300)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between" data-testid="snippet-toolbar" role="toolbar" aria-label="Snippet management toolbar">
      <div className="relative flex-1 w-full sm:max-w-md" data-testid="search-container">
        <MagnifyingGlass
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder={strings.app.search.placeholder}
          value={inputValue}
          onChange={(e) => handleSearchInput(e.target.value)}
          className="pl-10"
          data-testid="snippet-search-input"
          aria-label="Search snippets"
        />
      </div>
      <div className="flex gap-2 w-full sm:w-auto" data-testid="toolbar-actions">
        <Button
          variant={selectionMode ? "filled" : "outline"}
          onClick={onToggleSelectionMode}
          className="gap-2"
          data-testid="snippet-selection-mode-btn"
          aria-pressed={selectionMode}
          aria-label={selectionMode ? "Cancel selection mode" : "Enter selection mode"}
        >
          {selectionMode ? (
            <>
              <X weight="bold" aria-hidden="true" />
              Cancel
            </>
          ) : (
            <>
              <CheckSquare weight="bold" aria-hidden="true" />
              Select
            </>
          )}
        </Button>
        <Button
          className="gap-2 w-full sm:w-auto"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          data-testid="snippet-create-menu-trigger"
          aria-label="Create new snippet"
          aria-haspopup="menu"
        >
          <Plus weight="bold" aria-hidden="true" />
          {strings.app.header.newSnippetButton}
          <CaretDown weight="bold" aria-hidden="true" />
        </Button>
        <TemplatePicker
          anchor={menuAnchor}
          onClose={() => setMenuAnchor(null)}
          onCreateNew={onCreateNew}
          onCreateFromTemplate={onCreateFromTemplate}
          data-testid="create-menu-content"
          sections={[
            { label: 'React Components', templates: templates.filter(t => t.category === 'react') },
            { label: 'Python Scripts', templates: templates.filter(t => t.category === 'python') },
            { label: 'JavaScript Utils', templates: templates.filter(t => t.category === 'javascript') },
          ]}
        />
      </div>
    </div>
  )
}
