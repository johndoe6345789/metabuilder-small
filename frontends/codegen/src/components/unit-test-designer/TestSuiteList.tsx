import { UnitTest } from '@/types/project'
import { Button, IconButton } from '@metabuilder/fakemui/inputs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Sparkle, Trash } from '@metabuilder/fakemui/icons'
import unitTestDesignerCopy from '@/data/unit-test-designer.json'

interface TestSuiteListProps {
  tests: UnitTest[]
  selectedTestId: string | null
  onSelectTest: (testId: string) => void
  onAddTest: () => void
  onDeleteTest: (testId: string) => void
  onGenerateWithAI: () => void
}

const getTestTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    component: '#3b82f6',
    function: '#22c55e',
    hook: '#a855f7',
    integration: '#f97316'
  }
  return colors[type] || '#6b7280'
}

export function TestSuiteList({
  tests,
  selectedTestId,
  onSelectTest,
  onAddTest,
  onDeleteTest,
  onGenerateWithAI
}: TestSuiteListProps) {
  return (
    <div>
      <div>
        <h2>{unitTestDesignerCopy.labels.testSuites}</h2>
        <div>
          <IconButton size="small" onClick={onGenerateWithAI}>
            <Sparkle size={14} weight="duotone" />
          </IconButton>
          <IconButton size="small" onClick={onAddTest}>
            <Plus size={14} />
          </IconButton>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div>
          {tests.map(test => (
            <div
              key={test.id}
              onClick={() => onSelectTest(test.id)}
            >
              <div>
                <div>
                  <div style={{ backgroundColor: getTestTypeColor(test.testType), width: 8, height: 8, borderRadius: '50%' }} />
                  <div>{test.name}</div>
                </div>
                <div>
                  {test.targetFile || unitTestDesignerCopy.labels.noFile}
                </div>
                <div>
                  {test.testCases.length} {unitTestDesignerCopy.labels.casesSuffix}
                </div>
              </div>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation()
                  onDeleteTest(test.id)
                }}
              >
                <Trash size={14} />
              </IconButton>
            </div>
          ))}
          {tests.length === 0 && (
            <div>
              {unitTestDesignerCopy.labels.noTestSuitesYet}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
