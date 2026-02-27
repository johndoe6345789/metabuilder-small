import { Card, Button, Chip, Avatar } from '@metabuilder/components/fakemui'

export function UserCardsSection() {
  return (
    <section className="space-y-6" data-testid="user-cards-section" role="region" aria-label="User profile card examples">
      <div>
        <h2 className="text-3xl font-bold mb-2">User Cards</h2>
        <p className="text-muted-foreground">
          Profile information with avatar and actions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12" src="https://i.pravatar.cc/150?img=1" alt="Alex Morgan">AM</Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">Alex Morgan</h3>
              <p className="text-sm text-muted-foreground">@alexmorgan</p>
              <p className="text-sm mt-2">
                Product designer passionate about creating delightful user experiences.
              </p>
            </div>
            <Button size="sm" variant="outlined">
              Follow
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16" src="https://i.pravatar.cc/150?img=2" alt="Jordan Davis">JD</Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">Jordan Davis</h3>
              <p className="text-sm text-muted-foreground mb-2">Senior Developer</p>
              <div className="flex gap-2">
                <Chip color="secondary">React</Chip>
                <Chip color="secondary">TypeScript</Chip>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
