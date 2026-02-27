import { Card } from '@metabuilder/components/fakemui'
import { Button } from '@metabuilder/components/fakemui'
import { Avatar } from '@metabuilder/components/fakemui'
import {
  Bell,
  Gear,
  House,
  ChartBar,
  Folder,
} from '@phosphor-icons/react'
import { ComponentShowcase } from '@/components/demo/ComponentShowcase'
import { organismsCodeSnippets } from '@/lib/component-code-snippets'
import { Snippet } from '@/lib/types'

interface NavigationBarsShowcaseProps {
  onSaveSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export function NavigationBarsShowcase({ onSaveSnippet }: NavigationBarsShowcaseProps) {
  return (
    <section className="space-y-6" data-testid="navigation-bars-showcase" role="region" aria-label="Navigation bars showcase">
      <div>
        <h2 className="text-3xl font-bold mb-2">Navigation Bars</h2>
        <p className="text-muted-foreground">
          Complete navigation components with branding and actions
        </p>
      </div>

      <ComponentShowcase
        code={organismsCodeSnippets.navigationBar}
        title="Navigation Bar"
        description="Primary navigation with user menu and notifications"
        category="organisms"
        onSaveSnippet={onSaveSnippet}
      >
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h3 className="text-xl font-bold">BrandName</h3>
                <nav className="hidden md:flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    <House className="mr-2" aria-hidden="true" />
                    Home
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ChartBar className="mr-2" aria-hidden="true" />
                    Analytics
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Folder className="mr-2" aria-hidden="true" />
                    Projects
                  </Button>
                </nav>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost">
                  <Bell aria-hidden="true" />
                </Button>
                <Button variant="ghost">
                  <Gear aria-hidden="true" />
                </Button>
                <Avatar className="h-8 w-8" src="https://i.pravatar.cc/150?img=3" alt="User">U</Avatar>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-muted-foreground">
              Primary navigation with user menu and notifications
            </p>
          </div>
        </Card>
      </ComponentShowcase>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-card">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-accent" />
                <h3 className="text-xl font-bold">Product</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outlined" size="sm">
                Sign In
              </Button>
              <Button size="sm">Get Started</Button>
            </div>
          </div>
          <nav className="px-4 pb-2 flex items-center gap-1 overflow-x-auto">
            <Button variant="ghost" size="sm" className="text-accent">
              Features
            </Button>
            <Button variant="ghost" size="sm">
              Pricing
            </Button>
            <Button variant="ghost" size="sm">
              Documentation
            </Button>
            <Button variant="ghost" size="sm">
              Blog
            </Button>
          </nav>
        </div>

        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Marketing site navigation with CTAs
          </p>
        </div>
      </Card>
    </section>
  )
}
