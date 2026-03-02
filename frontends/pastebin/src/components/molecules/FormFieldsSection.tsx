import { Card } from '@metabuilder/components/fakemui'
import { Input } from '@metabuilder/components/fakemui'
import { FormLabel } from '@metabuilder/components/fakemui'
import { Envelope, Lock } from '@phosphor-icons/react'
import { ComponentShowcase } from '@/components/demo/ComponentShowcase'
import { moleculesCodeSnippets } from '@/lib/component-code-snippets'
import { Snippet } from '@/lib/types'

interface FormFieldsSectionProps {
  onSaveSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export function FormFieldsSection({ onSaveSnippet }: FormFieldsSectionProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} data-testid="form-fields-section" role="region" aria-label="Form field components">
      <div>
        <h2 style={{ fontSize: '1.875rem', lineHeight: '2.25rem', fontWeight: 700, marginBottom: '8px' }}>Form Fields</h2>
        <p style={{ color: 'var(--mat-sys-on-surface-variant)' }}>
          Input fields with labels and helper text
        </p>
      </div>

      <ComponentShowcase
        code={moleculesCodeSnippets.formField}
        title="Form Field with Icon and Helper Text"
        description="Complete form field with label, icon, and validation message"
        category="molecules"
        onSaveSnippet={onSaveSnippet}
      >
        <Card className="p-6">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '448px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FormLabel htmlFor="name">Full Name</FormLabel>
              <Input id="name" placeholder="John Doe" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FormLabel htmlFor="email">Email Address</FormLabel>
              <div style={{ position: 'relative' }}>
                <Envelope style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'var(--mat-sys-on-surface-variant)' }} />
                <Input id="email" type="email" placeholder="john@example.com" className="pl-10" />
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: '1.25rem', color: 'var(--mat-sys-on-surface-variant)' }}>
                We&apos;ll never share your email with anyone else.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'var(--mat-sys-on-surface-variant)' }} />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10" />
              </div>
            </div>
          </div>
        </Card>
      </ComponentShowcase>
    </section>
  )
}
