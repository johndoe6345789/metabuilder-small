"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, DialogClose, Button } from '@metabuilder/components/fakemui'
import { X } from '@phosphor-icons/react'
import { Snippet } from '@/lib/types'
import { appConfig } from '@/lib/config'
import { useTranslation } from '@/hooks/useTranslation'
import { useSnippetForm } from '@/hooks/useSnippetForm'
import { SnippetDialogTabs } from './SnippetDialogTabs'
import styles from './snippet-dialog.module.scss'

interface SnippetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => void
  editingSnippet?: Snippet | null
}

export function SnippetDialog({ open, onOpenChange, onSave, editingSnippet }: SnippetDialogProps) {
  const t = useTranslation()
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (open) setActiveTab(0)
  }, [open])

  const {
    title, description, language, code, hasPreview,
    functionName, inputParameters, errors,
    setTitle, setDescription, setLanguage, setCode, setHasPreview,
    setFunctionName, handleAddParameter, handleRemoveParameter,
    handleUpdateParameter, validate, getFormData, resetForm,
  } = useSnippetForm(editingSnippet, open)

  const isPreviewSupported = appConfig.previewEnabledLanguages.includes(language)
  const showPreviewTab = isPreviewSupported && hasPreview
  const tabCount = showPreviewTab ? 3 : 2

  const handleSave = () => {
    if (!validate()) {
      if (errors.code) setActiveTab(1)
      return
    }
    onSave(getFormData())
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="lg" fullWidth>
      <DialogClose onClick={() => onOpenChange(false)} aria-label="Close dialog">
        <X size={20} />
      </DialogClose>

      <DialogTitle>
        {editingSnippet?.id ? t.snippetDialog.edit.title : t.snippetDialog.create.title}
      </DialogTitle>

      <DialogContent dividers data-testid="snippet-dialog" className={styles.dialogContent}>
        <SnippetDialogTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          title={title}
          description={description}
          language={language}
          code={code}
          hasPreview={hasPreview}
          functionName={functionName}
          inputParameters={inputParameters}
          errors={errors}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onLanguageChange={setLanguage}
          onCodeChange={setCode}
          onPreviewChange={setHasPreview}
          onFunctionNameChange={setFunctionName}
          onAddParameter={handleAddParameter}
          onRemoveParameter={handleRemoveParameter}
          onUpdateParameter={handleUpdateParameter}
        />
      </DialogContent>

      <DialogActions>
        {activeTab > 0 && (
          <Button
            variant="outlined"
            onClick={() => setActiveTab(t => t - 1)}
            aria-label="Go to previous tab"
            className={styles.backButton}
          >
            Back
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={() => onOpenChange(false)}
          data-testid="snippet-dialog-cancel-btn"
          aria-label="Cancel editing snippet"
        >
          {t.snippetDialog.buttons.cancel}
        </Button>
        {activeTab < tabCount - 1 ? (
          <Button variant="filled" onClick={() => setActiveTab(t => t + 1)} aria-label="Go to next tab">
            Next
          </Button>
        ) : (
          <Button
            variant="filled"
            onClick={handleSave}
            data-testid="snippet-dialog-save-btn"
            aria-label={editingSnippet ? "Update snippet" : "Create new snippet"}
          >
            {editingSnippet ? t.snippetDialog.buttons.update : t.snippetDialog.buttons.create} Snippet
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
