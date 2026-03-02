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
    <Card className={styles.cardRoot} data-testid="input-parameters-card">
      <CardHeader>
        <h3
          className={styles.configTitle}
          data-testid="preview-config-title"
        >
          <span>Preview Configuration</span>
          <Button
            variant="outlined"
            size="sm"
            onClick={onAddParameter}
            className={styles.addParamBtn}
            data-testid="add-parameter-btn"
            aria-label={`Add new parameter. Current parameters: ${inputParameters.length}`}
          >
            <Plus className={styles.addParamIcon} aria-hidden="true" />
            Add Parameter
          </Button>
        </h3>
      </CardHeader>
      <CardContent>
        <div className={styles.cardContent}>
          <div className={styles.functionNameField}>
            <FormLabel htmlFor="functionName">
              Function/Component Name (Optional)
            </FormLabel>
            <Input
              id="functionName"
              placeholder="e.g., MyComponent"
              value={functionName}
              onChange={(e) => onFunctionNameChange(e.target.value)}
              data-testid="function-name-input"
              aria-label="Function or component name"
              aria-describedby="function-name-help"
            />
            <p className={styles.helpText} id="function-name-help">
              The name of the function or component to render. Leave empty to use the default export.
            </p>
          </div>

          {inputParameters.length > 0 && (
            <div className={styles.parametersList} role="region" aria-label="Input parameters list">
              {/* Aria-live region for parameter change announcements */}
              <div
                className={styles.srOnly}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-testid="parameters-status"
              >
                {inputParameters.length} parameter{inputParameters.length !== 1 ? 's' : ''} configured
              </div>

              <FormLabel className={styles.parametersLabel}>Input Parameters (Props)</FormLabel>
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
        </div>
      </CardContent>
    </Card>
  )
}
