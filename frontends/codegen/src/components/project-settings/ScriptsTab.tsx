import { Button } from '@metabuilder/fakemui/inputs'
import { Card, CardContent } from '@metabuilder/fakemui/surfaces'
import { NpmSettings } from '@/types/project'
import projectSettingsCopy from '@/data/project-settings.json'
import { Code, Plus, Trash } from '@metabuilder/fakemui/icons'

interface ScriptsTabProps {
  npmSettings: NpmSettings
  onAddScript: () => void
  onEditScript: (key: string, value: string) => void
  onDeleteScript: (key: string) => void
}

export function ScriptsTab({
  npmSettings,
  onAddScript,
  onEditScript,
  onDeleteScript,
}: ScriptsTabProps) {
  const copy = projectSettingsCopy.scripts
  const scripts = Object.entries(npmSettings.scripts)

  return (
    <div>
      <div>
        <div>
          <h3>{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
        <Button onClick={onAddScript}>
          <Plus size={16} />
          {copy.dialog.title.add}
        </Button>
      </div>

      <div>
        {scripts.map(([key, value]) => (
          <Card key={key}>
            <CardContent>
              <div>
                <div>
                  <div>
                    <Code size={18} />
                    <code>{key}</code>
                  </div>
                  <code>{value}</code>
                </div>
                <div>
                  <Button size="small" variant="outlined" onClick={() => onEditScript(key, value)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onDeleteScript(key)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {scripts.length === 0 && (
          <Card>
            <p>{copy.empty}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
