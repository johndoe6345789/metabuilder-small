'use client'

import { Card, CardContent, CardHeader } from '@metabuilder/components/fakemui'

export const DemoFeatureCards = () => {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      data-testid="demo-feature-cards"
      role="region"
      aria-label="Feature cards"
    >
      <Card className="border-primary/20" data-testid="feature-card-realtime">
        <CardHeader>
          <h3 style={{fontWeight:600, marginBottom:'2px'}} className="text-lg">Real-Time Updates</h3>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Watch your React components render instantly as you type. No refresh needed.
        </CardContent>
      </Card>

      <Card className="border-accent/20" data-testid="feature-card-resizable">
        <CardHeader>
          <h3 style={{fontWeight:600, marginBottom:'2px'}} className="text-lg">Resizable Panels</h3>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Drag the center divider to adjust the editor and preview panel sizes to your preference.
        </CardContent>
      </Card>

      <Card className="border-primary/20" data-testid="feature-card-viewmodes">
        <CardHeader>
          <h3 style={{fontWeight:600, marginBottom:'2px'}} className="text-lg">Multiple View Modes</h3>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Switch between code-only, split-screen, or preview-only modes with the toggle buttons.
        </CardContent>
      </Card>
    </div>
  )
}
