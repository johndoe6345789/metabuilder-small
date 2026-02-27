import { Card, Chip, Divider } from '@metabuilder/components/fakemui'

export function StatusIndicatorsSection() {
  return (
    <section className="space-y-6" data-testid="status-indicators-section" role="region" aria-label="Status indicator examples">
      <div>
        <h2 className="text-3xl font-bold mb-2">Status Indicators</h2>
        <p className="text-muted-foreground">
          Combined elements showing status and information
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-accent animate-pulse" />
              <span className="font-medium">System Online</span>
            </div>
            <Chip>Active</Chip>
          </div>

          <Divider />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span className="font-medium">Service Unavailable</span>
            </div>
            <Chip color="error">Error</Chip>
          </div>

          <Divider />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <span className="font-medium">Maintenance Mode</span>
            </div>
            <Chip color="secondary">Scheduled</Chip>
          </div>
        </div>
      </Card>
    </section>
  )
}
