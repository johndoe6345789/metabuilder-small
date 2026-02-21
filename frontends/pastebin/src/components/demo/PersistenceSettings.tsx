'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FloppyDisk } from '@phosphor-icons/react'

const PERSIST_CONFIG = {
  key: 'pastebin',
  storage: 'IndexedDB',
  whitelist: ['snippets', 'namespaces', 'ui'],
  throttle: 100,
}

export function PersistenceSettings() {
  return (
    <Card data-testid="persistence-settings">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center" aria-hidden="true">
            <FloppyDisk className="h-5 w-5 text-primary" weight="duotone" />
          </div>
          <div>
            <CardTitle>Redux Persistence</CardTitle>
            <CardDescription>
              Automatic IndexedDB persistence via @metabuilder/redux-persist
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm" data-testid="persist-config-section">
          <div data-testid="persist-key-stat">
            <div className="text-muted-foreground">Persist Key</div>
            <div className="font-medium font-mono">{PERSIST_CONFIG.key}</div>
          </div>
          <div data-testid="persist-storage-stat">
            <div className="text-muted-foreground">Storage Backend</div>
            <div className="font-medium">{PERSIST_CONFIG.storage}</div>
          </div>
          <div data-testid="persist-throttle-stat">
            <div className="text-muted-foreground">Throttle</div>
            <div className="font-medium">{PERSIST_CONFIG.throttle}ms</div>
          </div>
          <div data-testid="persist-slices-count-stat">
            <div className="text-muted-foreground">Persisted Slices</div>
            <div className="font-medium">{PERSIST_CONFIG.whitelist.length}</div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2" data-testid="persisted-slices-section" role="region" aria-label="Persisted slices">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Persisted Slices</span>
            <Badge data-testid="slices-count">{PERSIST_CONFIG.whitelist.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-1">
            {PERSIST_CONFIG.whitelist.map((slice) => (
              <Badge key={slice} variant="outline" className="text-xs font-mono" data-testid={`slice-badge-${slice}`}>
                {slice}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
