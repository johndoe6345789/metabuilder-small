import { Chip } from '@metabuilder/components/fakemui'
import { Card } from '@metabuilder/components/fakemui'
import { Divider } from '@metabuilder/components/fakemui'
import { Check, X, Star } from '@phosphor-icons/react'
import { ComponentShowcase } from '@/components/demo/ComponentShowcase'
import { atomsCodeSnippets } from '@/lib/component-code-snippets'
import { Snippet } from '@/lib/types'

interface BadgesSectionProps {
  onSaveSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export function BadgesSection({ onSaveSnippet }: BadgesSectionProps) {
  return (
    <section className="space-y-6" data-testid="badges-section" role="region" aria-label="Badge status indicators">
      <div>
        <h2 className="text-3xl font-bold mb-2">Badges</h2>
        <p className="text-muted-foreground">
          Small status indicators and labels
        </p>
      </div>
      
      <ComponentShowcase
        code={atomsCodeSnippets.badgeWithIcons}
        title="Badge with Icons"
        description="Badge components with icon combinations"
        category="atoms"
        onSaveSnippet={onSaveSnippet}
      >
        <Card className="p-6">
          <div className="space-y-8">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Variants
              </h3>
              <div className="flex flex-wrap gap-4">
                <Chip>Default</Chip>
                <Chip color="secondary">Secondary</Chip>
                <Chip color="error">Destructive</Chip>
                <Chip variant="outlined">Outline</Chip>
              </div>
            </div>

            <Divider />

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                With Icons
              </h3>
              <div className="flex flex-wrap gap-4">
                <Chip>
                  <Check weight="bold" className="mr-1" />
                  Completed
                </Chip>
                <Chip color="error">
                  <X weight="bold" className="mr-1" />
                  Failed
                </Chip>
                <Chip color="secondary">
                  <Star weight="fill" className="mr-1" />
                  Featured
                </Chip>
              </div>
            </div>
          </div>
        </Card>
      </ComponentShowcase>
    </section>
  )
}
