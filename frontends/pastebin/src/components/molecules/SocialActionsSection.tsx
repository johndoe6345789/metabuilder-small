import { Card, Button, Divider } from '@metabuilder/components/fakemui'
import { Heart, ChatCircle, Share, DotsThree } from '@phosphor-icons/react'

export function SocialActionsSection() {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} data-testid="social-actions-section" role="region" aria-label="Social action buttons">
      <div>
        <h2 style={{ fontSize: '1.875rem', lineHeight: '2.25rem', fontWeight: 700, marginBottom: '8px' }}>Social Actions</h2>
        <p style={{ color: 'var(--mat-sys-on-surface-variant)' }}>
          Grouped interactive buttons for social features
        </p>
      </div>

      <Card className="p-6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button variant="ghost" size="sm">
              <Heart style={{ marginRight: '8px' }} />
              Like
            </Button>
            <Button variant="ghost" size="sm">
              <ChatCircle style={{ marginRight: '8px' }} />
              Comment
            </Button>
            <Button variant="ghost" size="sm">
              <Share style={{ marginRight: '8px' }} />
              Share
            </Button>
          </div>

          <Divider />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Button variant="outlined" size="sm">
                <Heart weight="fill" style={{ color: 'var(--mat-sys-error)', marginRight: '8px' }} />
                <span style={{ color: 'var(--mat-sys-on-background)' }}>256</span>
              </Button>
              <Button variant="outlined" size="sm">
                <ChatCircle style={{ marginRight: '8px' }} />
                <span>42</span>
              </Button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button variant="ghost" size="sm">
                <Share />
              </Button>
              <Button variant="ghost" size="sm">
                <DotsThree weight="bold" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </section>
  )
}
