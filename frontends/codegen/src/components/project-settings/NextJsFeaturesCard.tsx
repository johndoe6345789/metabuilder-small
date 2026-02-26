import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@metabuilder/fakemui/surfaces'
import { Label } from '@metabuilder/fakemui/atoms'
import { Switch } from '@metabuilder/fakemui/inputs'
import projectSettingsCopy from '@/data/project-settings.json'
import { NextJsConfigSectionProps } from '@/components/project-settings/types'

export function NextJsFeaturesCard({
  nextjsConfig,
  onNextjsConfigChange,
}: NextJsConfigSectionProps) {
  const { features } = projectSettingsCopy.nextjs

  return (
    <Card>
      <CardHeader>
        <CardTitle>{features.title}</CardTitle>
        <CardDescription>{features.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <div>
            <Label htmlFor="typescript">{features.items.typescript.label}</Label>
            <p>{features.items.typescript.description}</p>
          </div>
          <Switch
            id="typescript"
            checked={nextjsConfig.typescript}
            onChange={(e) =>
              onNextjsConfigChange((current) => ({
                ...current,
                typescript: e.target.checked,
              }))
            }
          />
        </div>

        <div>
          <div>
            <Label htmlFor="eslint">{features.items.eslint.label}</Label>
            <p>{features.items.eslint.description}</p>
          </div>
          <Switch
            id="eslint"
            checked={nextjsConfig.eslint}
            onChange={(e) =>
              onNextjsConfigChange((current) => ({
                ...current,
                eslint: e.target.checked,
              }))
            }
          />
        </div>

        <div>
          <div>
            <Label htmlFor="tailwind">{features.items.tailwind.label}</Label>
            <p>{features.items.tailwind.description}</p>
          </div>
          <Switch
            id="tailwind"
            checked={nextjsConfig.tailwind}
            onChange={(e) =>
              onNextjsConfigChange((current) => ({
                ...current,
                tailwind: e.target.checked,
              }))
            }
          />
        </div>

        <div>
          <div>
            <Label htmlFor="src-dir">{features.items.srcDirectory.label}</Label>
            <p>{features.items.srcDirectory.description}</p>
          </div>
          <Switch
            id="src-dir"
            checked={nextjsConfig.srcDirectory}
            onChange={(e) =>
              onNextjsConfigChange((current) => ({
                ...current,
                srcDirectory: e.target.checked,
              }))
            }
          />
        </div>

        <div>
          <div>
            <Label htmlFor="app-router">{features.items.appRouter.label}</Label>
            <p>{features.items.appRouter.description}</p>
          </div>
          <Switch
            id="app-router"
            checked={nextjsConfig.appRouter}
            onChange={(e) =>
              onNextjsConfigChange((current) => ({
                ...current,
                appRouter: e.target.checked,
              }))
            }
          />
        </div>

        <div>
          <div>
            <Label htmlFor="turbopack">{features.items.turbopack.label}</Label>
            <p>{features.items.turbopack.description}</p>
          </div>
          <Switch
            id="turbopack"
            checked={nextjsConfig.turbopack || false}
            onChange={(e) =>
              onNextjsConfigChange((current) => ({
                ...current,
                turbopack: e.target.checked,
              }))
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
