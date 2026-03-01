'use client'

import { InputParameter } from '@/lib/types'
import { appConfig } from '@/lib/config'
import { SnippetFormFields } from './SnippetFormFields'
import { CodeEditorSection } from './CodeEditorSection'
import { InputParameterList } from './InputParameterList'

const TAB_BAR: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--mat-sys-outline-variant)',
  marginBottom: '28px',
}

const TAB_BTN_BASE: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: 'var(--mat-sys-on-surface-variant)',
  borderBottom: '2px solid transparent',
  marginBottom: '-1px',
  transition: 'color 150ms, border-color 150ms',
  letterSpacing: '0.01em',
}

const TAB_BTN_ACTIVE: React.CSSProperties = {
  color: 'var(--mat-sys-primary)',
  borderBottomColor: 'var(--mat-sys-primary)',
}

function DialogTabBar({ tabs, activeTab, onTabChange }: {
  tabs: string[]
  activeTab: number
  onTabChange: (i: number) => void
}) {
  return (
    <nav role="tablist" aria-label="Snippet editor sections" style={TAB_BAR}>
      {tabs.map((label, i) => (
        <button
          key={label}
          role="tab"
          id={`snippet-tab-${i}-btn`}
          aria-selected={activeTab === i}
          aria-controls={`snippet-tab-${i}-panel`}
          onClick={() => onTabChange(i)}
          style={activeTab === i ? { ...TAB_BTN_BASE, ...TAB_BTN_ACTIVE } : TAB_BTN_BASE}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}

/** Renders only when active — avoids mat-mdc-tab-body absolute positioning. */
function TabPanel({ active, index, children }: { active: boolean; index: number; children: React.ReactNode }) {
  if (!active) return null
  return (
    <section
      role="tabpanel"
      id={`snippet-tab-${index}-panel`}
      aria-labelledby={`snippet-tab-${index}-btn`}
    >
      {children}
    </section>
  )
}

export interface SnippetDialogTabsProps {
  activeTab: number
  onTabChange: (tab: number) => void
  title: string
  description: string
  language: string
  code: string
  hasPreview: boolean
  functionName: string
  inputParameters: InputParameter[]
  errors: { title?: string; code?: string }
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onLanguageChange: (v: string) => void
  onCodeChange: (v: string) => void
  onPreviewChange: (v: boolean) => void
  onFunctionNameChange: (v: string) => void
  onAddParameter: () => void
  onRemoveParameter: (i: number) => void
  onUpdateParameter: (i: number, field: keyof InputParameter, value: string) => void
}

export function SnippetDialogTabs({
  activeTab,
  onTabChange,
  title,
  description,
  language,
  code,
  hasPreview,
  functionName,
  inputParameters,
  errors,
  onTitleChange,
  onDescriptionChange,
  onLanguageChange,
  onCodeChange,
  onPreviewChange,
  onFunctionNameChange,
  onAddParameter,
  onRemoveParameter,
  onUpdateParameter,
}: SnippetDialogTabsProps) {
  const isPreviewSupported = appConfig.previewEnabledLanguages.includes(language)
  const showPreviewTab = isPreviewSupported && hasPreview

  const tabs = ['Details', 'Code', ...(showPreviewTab ? ['Preview Config'] : [])]

  return (
    <>
      <DialogTabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      <TabPanel active={activeTab === 0} index={0}>
        <SnippetFormFields
          title={title}
          description={description}
          language={language}
          errors={errors}
          onTitleChange={onTitleChange}
          onDescriptionChange={onDescriptionChange}
          onLanguageChange={onLanguageChange}
        />
      </TabPanel>

      <TabPanel active={activeTab === 1} index={1}>
        <CodeEditorSection
          code={code}
          language={language}
          hasPreview={hasPreview}
          functionName={functionName}
          inputParameters={inputParameters}
          errors={errors}
          onCodeChange={onCodeChange}
          onPreviewChange={onPreviewChange}
          height="360px"
        />
      </TabPanel>

      {showPreviewTab && (
        <TabPanel active={activeTab === 2} index={2}>
          <InputParameterList
            inputParameters={inputParameters}
            functionName={functionName}
            onFunctionNameChange={onFunctionNameChange}
            onAddParameter={onAddParameter}
            onRemoveParameter={onRemoveParameter}
            onUpdateParameter={onUpdateParameter}
          />
        </TabPanel>
      )}
    </>
  )
}
