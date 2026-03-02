import { useState } from 'react'
import { Card, CardContent, CardHeader, Button, Input, FormLabel } from '@metabuilder/components/fakemui'
import { useAppDispatch } from '@/store/hooks'
import { createSnippet } from '@/store/slices/snippetsSlice'
import { FloppyDisk, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import styles from './PersistenceExample.module.scss'

export function PersistenceExample() {
  const dispatch = useAppDispatch()
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')

  const handleCreate = () => {
    if (!title || !code) {
      toast.error('Please enter both title and code')
      return
    }

    dispatch(createSnippet({
      title,
      code,
      language: 'JavaScript',
      category: 'Example',
      description: 'Created via persistence example',
    }))

    toast.success('Snippet created and auto-saved to database!')
    setTitle('')
    setCode('')
  }

  return (
    <Card data-testid="persistence-example">
      <CardHeader>
        <div className={styles.headerRow}>
          <div className={styles.iconWrap} aria-hidden="true">
            <FloppyDisk className={styles.headerIcon} weight="duotone" />
          </div>
          <div>
            <h3 style={{ fontWeight: 600 }}>Auto-Persistence Example</h3>
            <p className={styles.subtitle}>
              Create a snippet and watch it automatically save to the database
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={styles.cardBody}>
          <div className={styles.field} data-testid="title-field">
            <FormLabel htmlFor="example-title">Snippet Title</FormLabel>
            <Input
              id="example-title"
              placeholder="My Awesome Snippet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="title-input"
              aria-label="Snippet title"
            />
          </div>

          <div className={styles.field} data-testid="code-field">
            <FormLabel htmlFor="example-code">Code</FormLabel>
            <textarea
              id="example-code"
              placeholder="console.log('Hello World')"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={styles.textarea}
              data-testid="code-textarea"
              aria-label="Code snippet content"
            />
          </div>

          <Button onClick={handleCreate} className={styles.fullWidthBtn} data-testid="create-snippet-button" aria-label="Create snippet and auto-save to database">
            <Plus weight="bold" size={16} aria-hidden="true" />
            Create Snippet (Auto-Saves)
          </Button>

          <div className={styles.howItWorks} data-testid="how-it-works-section" role="region" aria-label="How persistence works">
            <div className={styles.howTitle}>How It Works</div>
            <ul className={styles.stepList} data-testid="workflow-list">
              <li data-testid="step-1">Click "Create Snippet" to dispatch a Redux action</li>
              <li data-testid="step-2">Persistence middleware intercepts the action</li>
              <li data-testid="step-3">Database save happens automatically (100ms debounce)</li>
              <li data-testid="step-4">Check console for: <code className={styles.inlineCode}>[Redux Persistence] State synced to database</code></li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
