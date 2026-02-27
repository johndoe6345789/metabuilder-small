import { Trash } from '@phosphor-icons/react'
import { Button, Card, CardContent, Input, FormLabel, Select, MenuItem } from '@metabuilder/components/fakemui'
import type { SelectChangeEvent } from '@metabuilder/components/fakemui'
import { InputParameter } from '@/lib/types'

interface InputParameterItemProps {
  param: InputParameter
  index: number
  onUpdate: (index: number, field: keyof InputParameter, value: string) => void
  onRemove: (index: number) => void
}

export function InputParameterItem({ param, index, onUpdate, onRemove }: InputParameterItemProps) {
  const getPlaceholder = (type: string) => {
    switch (type) {
      case 'string':
        return '"Hello World"'
      case 'number':
        return '42'
      case 'boolean':
        return 'true'
      case 'array':
        return '["item1", "item2"]'
      case 'object':
        return '{"key": "value"}'
      default:
        return ''
    }
  }

  return (
    <Card className="bg-background" data-testid={`param-item-${index}`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FormLabel htmlFor={`param-name-${index}`} className="text-xs">
                Name *
              </FormLabel>
              <Input
                id={`param-name-${index}`}
                placeholder="paramName"
                value={param.name}
                onChange={(e) => onUpdate(index, 'name', e.target.value)}
                className="h-8 text-sm"
                data-testid={`param-name-input-${index}`}
                aria-label={`Parameter ${index + 1} name`}
                required
                aria-required="true"
              />
            </div>
            <div className="space-y-1.5">
              <FormLabel htmlFor={`param-type-${index}`} className="text-xs">
                Type
              </FormLabel>
              <Select
                value={param.type}
                onChange={(e: SelectChangeEvent) => onUpdate(index, 'type', e.target.value as string)}
                inputProps={{
                  id: `param-type-${index}`,
                  className: 'h-8 text-sm',
                  'data-testid': `param-type-select-${index}`,
                  'aria-label': `Parameter ${index + 1} type`,
                }}
                data-testid={`param-type-options-${index}`}
                aria-label="Parameter type options"
              >
                <MenuItem value="string" data-testid="type-string">string</MenuItem>
                <MenuItem value="number" data-testid="type-number">number</MenuItem>
                <MenuItem value="boolean" data-testid="type-boolean">boolean</MenuItem>
                <MenuItem value="array" data-testid="type-array">array</MenuItem>
                <MenuItem value="object" data-testid="type-object">object</MenuItem>
              </Select>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 w-8 p-0 mt-6 text-destructive hover:text-destructive"
            data-testid={`remove-parameter-btn-${index}`}
            aria-label={`Remove parameter ${index + 1}`}
          >
            <Trash className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="space-y-1.5">
          <FormLabel htmlFor={`param-default-${index}`} className="text-xs">
            Default Value *
          </FormLabel>
          <Input
            id={`param-default-${index}`}
            placeholder={getPlaceholder(param.type)}
            value={param.defaultValue}
            onChange={(e) => onUpdate(index, 'defaultValue', e.target.value)}
            className="h-8 text-sm font-mono"
            data-testid={`param-default-input-${index}`}
            aria-label={`Parameter ${index + 1} default value`}
            required
            aria-required="true"
          />
        </div>
        <div className="space-y-1.5">
          <FormLabel htmlFor={`param-desc-${index}`} className="text-xs">
            Description (Optional)
          </FormLabel>
          <Input
            id={`param-desc-${index}`}
            placeholder="What does this parameter do?"
            value={param.description || ''}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            className="h-8 text-sm"
            data-testid={`param-description-input-${index}`}
            aria-label={`Parameter ${index + 1} description`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
