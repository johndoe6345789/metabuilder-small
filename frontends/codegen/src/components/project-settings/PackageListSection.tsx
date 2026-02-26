import { Badge } from '@metabuilder/fakemui/data-display'
import { Button } from '@metabuilder/fakemui/inputs'
import { Card, CardContent } from '@metabuilder/fakemui/surfaces'
import { NpmPackage } from '@/types/project'
import { Package, Trash } from '@metabuilder/fakemui/icons'

interface PackageListSectionProps {
  title: string
  emptyCopy: string
  iconClassName: string
  showDevBadge?: boolean
  packages: NpmPackage[]
  onEditPackage: (pkg: NpmPackage) => void
  onDeletePackage: (packageId: string) => void
}

export function PackageListSection({
  title,
  emptyCopy,
  iconClassName,
  showDevBadge = false,
  packages,
  onEditPackage,
  onDeletePackage,
}: PackageListSectionProps) {
  return (
    <div>
      <h4>{title}</h4>
      <div>
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <CardContent>
              <div>
                <div>
                  <div>
                    <Package size={18} className={iconClassName} />
                    <code>{pkg.name}</code>
                    <Badge variant="tonal">{pkg.version}</Badge>
                    {showDevBadge && (
                      <Badge variant="outlined">dev</Badge>
                    )}
                  </div>
                  {pkg.description && (
                    <p>{pkg.description}</p>
                  )}
                </div>
                <div>
                  <Button size="small" variant="outlined" onClick={() => onEditPackage(pkg)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onDeletePackage(pkg.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {packages.length === 0 && (
          <Card>
            <p>{emptyCopy}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
