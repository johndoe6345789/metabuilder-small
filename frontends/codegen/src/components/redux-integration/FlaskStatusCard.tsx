import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowsClockwise, CheckCircle, CloudArrowUp, XCircle } from '@metabuilder/fakemui/icons'
import reduxIntegrationCopy from '@/data/redux-integration-demo.json'
import type { DBALConfigResponse } from '@/store/middleware/dbalSync'

type DBALStatusCardProps = {
  dbalConnected: boolean
  dbalStats: DBALConfigResponse | null
  onCheckConnection: () => void
}

export function DBALStatusCard({ dbalConnected, dbalStats, onCheckConnection }: DBALStatusCardProps) {
  const connectionLabel = dbalConnected
    ? reduxIntegrationCopy.cards.dbal.status.connected
    : reduxIntegrationCopy.cards.dbal.status.disconnected

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudArrowUp className="w-5 h-5" />
          {reduxIntegrationCopy.cards.dbal.title}
        </CardTitle>
        <CardDescription>{reduxIntegrationCopy.cards.dbal.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {reduxIntegrationCopy.cards.dbal.labels.connection}
          </span>
          {dbalConnected ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              {connectionLabel}
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              {connectionLabel}
            </Badge>
          )}
        </div>
        {dbalStats && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Adapter
              </span>
              <Badge variant="outline">{dbalStats.adapter}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Status
              </span>
              <Badge variant="outline">{dbalStats.status}</Badge>
            </div>
          </>
        )}
        <Separator />
        <Button onClick={onCheckConnection} variant="outline" size="sm" className="w-full">
          <ArrowsClockwise className="w-4 h-4 mr-2" />
          {reduxIntegrationCopy.cards.dbal.labels.checkConnection}
        </Button>
      </CardContent>
    </Card>
  )
}
