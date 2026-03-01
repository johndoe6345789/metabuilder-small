import { FormLabel, Input, Select, MenuItem, Textarea } from '@metabuilder/components/fakemui'
import type { SelectChangeEvent } from '@metabuilder/components/fakemui'
import { LANGUAGES } from '@/lib/config'
import { useTranslation } from '@/hooks/useTranslation'
import styles from './snippet-form-fields.module.scss'

interface SnippetFormFieldsProps {
  title: string
  description: string
  language: string
  errors: { title?: string; code?: string }
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onLanguageChange: (value: string) => void
}

export function SnippetFormFields({
  title,
  description,
  language,
  errors,
  onTitleChange,
  onDescriptionChange,
  onLanguageChange,
}: SnippetFormFieldsProps) {
  const t = useTranslation()
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex-1 space-y-2">
          <FormLabel htmlFor="title">{t.snippetDialog.fields.title.label} *</FormLabel>
          <Input
            id="title"
            placeholder={t.snippetDialog.fields.title.placeholder}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={errors.title ? 'border-destructive ring-destructive' : ''}
            data-testid="snippet-title-input"
            required
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "title-error" : undefined}
          />
          {errors.title && (
            <p className="text-sm text-destructive" id="title-error">
              {errors.title}
            </p>
          )}
        </div>

        <div className="space-y-2 w-full sm:w-auto sm:min-w-[180px]">
          <FormLabel htmlFor="language">{t.snippetDialog.fields.language.label}</FormLabel>
          <Select
            value={language}
            onChange={(e: SelectChangeEvent) => onLanguageChange(e.target.value as string)}
            inputProps={{
              id: 'language',
              'data-testid': 'snippet-language-select',
              'aria-label': 'Select programming language',
            }}
            data-testid="snippet-language-options"
          >
            {LANGUAGES.map((lang) => (
              <MenuItem key={lang} value={lang} data-testid={`language-option-${lang}`}>
                {lang}
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <FormLabel htmlFor="description">{t.snippetDialog.fields.description.label}</FormLabel>
        <Textarea
          id="description"
          placeholder={t.snippetDialog.fields.description.placeholder}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className={styles.textarea}
          data-testid="snippet-description-textarea"
          aria-label="Snippet description"
        />
      </div>
    </div>
  )
}
