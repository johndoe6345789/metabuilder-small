import { Plus } from '@phosphor-icons/react'
import { Button, Card, CardContent, CardHeader, Input, FormLabel } from '@metabuilder/components/fakemui'
import { InputParameter } from '@/lib/types'
import { InputParameterItem } from './InputParameterItem'
import styles from './input-parameter-list.module.scss'

interface InputParameterListProps {
  inputParameters: InputParameter[]
  functionName: string
  onFunctionNameChange: (name: string) => void
  onAddParameter: () => void
  onRemoveParameter: (index: number) => void
  onUpdateParameter: (index: number, field: keyof InputParameter, value: string) => void
}

export function InputParameterList({
  inputParameters,
  functionName,
  onFunctionNameChange,
  onAddParameter,
  onRemoveParameter,
  onUpdateParameter,
}: InputParameterListProps) {
  return (
    <Card className="bg-muted/30" data-testid="input-parameters-card">
      <CardHeader className="pb-3">
        <h3
          className={`text-base flex items-center justify-between ${styles.configTitle}`}
          data-testid="preview-config-title"
        >
          <span>Preview Configuration</span>
          <Button
            variant="outlined"
            size="sm"
            onClick={onAddParameter}
            className="gap-2"
            data-testid="add-parameter-btn"
            aria-label={`Add new parameter. Current parameters: ${inputParameters.length}`}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Add Parameter
          </Button>
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <FormLabel htmlFor="functionName" className="text-sm">
            Function/Component Name (Optional)
          </FormLabel>
          <Input
            id="functionName"
            placeholder="e.g., MyComponent"
            value={functionName}
            onChange={(e) => onFunctionNameChange(e.target.value)}
            className="bg-background"
            data-testid="function-name-input"
            aria-label="Function or component name"
            aria-describedby="function-name-help"
          />
          <p className="text-xs text-muted-foreground" id="function-name-help">
            The name of the function or component to render. Leave empty to use the default export.
          </p>
        </div>

        {inputParameters.length > 0 && (
          <div className="space-y-3" role="region" aria-label="Input parameters list">
            {/* Aria-live region for parameter change announcements */}
            <div
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-testid="parameters-status"
            >
              {inputParameters.length} parameter{inputParameters.length !== 1 ? 's' : ''} configured
            </div>

            <FormLabel className="text-sm font-medium">Input Parameters (Props)</FormLabel>
            {inputParameters.map((param, index) => (
              <InputParameterItem
                key={index}
                param={param}
                index={index}
                onUpdate={onUpdateParameter}
                onRemove={onRemoveParameter}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
