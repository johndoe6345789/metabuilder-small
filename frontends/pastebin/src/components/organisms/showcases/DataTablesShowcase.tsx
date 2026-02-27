import { Card, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@metabuilder/components/fakemui'

export function DataTablesShowcase() {
  return (
    <section className="space-y-6" data-testid="data-tables-showcase" role="region" aria-label="Data tables showcase">
      <div>
        <h2 className="text-3xl font-bold mb-2">Data Tables</h2>
        <p className="text-muted-foreground">
          Structured data display with actions
        </p>
      </div>

      <Card>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Recent Transactions</h3>
            <Button variant="outlined" size="sm">
              Export
            </Button>
          </div>
        </div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Transaction</TableCell>
                <TableCell>Date</TableCell>
                <TableCell className="text-right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Chip>Completed</Chip>
                </TableCell>
                <TableCell className="font-medium">Payment received</TableCell>
                <TableCell>Mar 15, 2024</TableCell>
                <TableCell className="text-right">$250.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Chip color="secondary">Pending</Chip>
                </TableCell>
                <TableCell className="font-medium">Processing payment</TableCell>
                <TableCell>Mar 14, 2024</TableCell>
                <TableCell className="text-right">$150.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Chip>Completed</Chip>
                </TableCell>
                <TableCell className="font-medium">Refund issued</TableCell>
                <TableCell>Mar 13, 2024</TableCell>
                <TableCell className="text-right text-destructive">-$75.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Chip color="error">Failed</Chip>
                </TableCell>
                <TableCell className="font-medium">Payment declined</TableCell>
                <TableCell>Mar 12, 2024</TableCell>
                <TableCell className="text-right">$0.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </section>
  )
}
