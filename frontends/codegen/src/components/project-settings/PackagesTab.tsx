import { NpmPackage, NpmSettings } from '@/types/project'
import { Button } from '@metabuilder/fakemui/inputs'
import { Label } from '@metabuilder/fakemui/atoms'
import projectSettingsCopy from '@/data/project-settings.json'
import { Plus } from '@metabuilder/fakemui/icons'
import { PackageListSection } from '@/components/project-settings/PackageListSection'

interface PackagesTabProps {
  npmSettings: NpmSettings
  onNpmSettingsChange: (settings: NpmSettings | ((current: NpmSettings) => NpmSettings)) => void
  onAddPackage: () => void
  onEditPackage: (pkg: NpmPackage) => void
  onDeletePackage: (packageId: string) => void
}

export function PackagesTab({
  npmSettings,
  onNpmSettingsChange,
  onAddPackage,
  onEditPackage,
  onDeletePackage,
}: PackagesTabProps) {
  const copy = projectSettingsCopy.packages
  const dependencies = npmSettings.packages.filter((pkg) => !pkg.isDev)
  const devDependencies = npmSettings.packages.filter((pkg) => pkg.isDev)

  return (
    <div>
      <div>
        <div>
          <h3>{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
        <Button onClick={onAddPackage}>
          <Plus size={16} />
          {copy.dialog.title.add}
        </Button>
      </div>

      <div>
        <Label htmlFor="package-manager">{copy.packageManager.label}</Label>
        <select
          id="package-manager"
          value={npmSettings.packageManager}
          onChange={(e) =>
            onNpmSettingsChange((current) => ({
              ...current,
              packageManager: e.target.value,
            }))
          }
        >
          <option value="npm">npm</option>
          <option value="yarn">yarn</option>
          <option value="pnpm">pnpm</option>
        </select>
      </div>

      <div>
        <PackageListSection
          title={copy.dependencies.title}
          emptyCopy={copy.dependencies.empty}
          iconClassName="text-primary"
          packages={dependencies}
          onEditPackage={onEditPackage}
          onDeletePackage={onDeletePackage}
        />
        <PackageListSection
          title={copy.devDependencies.title}
          emptyCopy={copy.devDependencies.empty}
          iconClassName="text-muted-foreground"
          showDevBadge
          packages={devDependencies}
          onEditPackage={onEditPackage}
          onDeletePackage={onDeletePackage}
        />
      </div>
    </div>
  )
}
