'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, CircleNotch, Warning } from '@phosphor-icons/react'
import { Button, Card } from '@metabuilder/components/fakemui'
import { runPythonViaFlask } from '@/lib/flask-runner'
import { PythonTerminal } from '@/components/features/python-runner/PythonTerminal'

interface PythonOutputProps {
  code: string
}

export function PythonOutput({ code }: PythonOutputProps) {
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [hasInput, setHasInput] = useState(false)

  useEffect(() => {
    setHasInput(/\binput\s*\(/i.test(code))
  }, [code])

  const handleRun = async () => {
    setIsRunning(true)
    setOutput('')
    setError('')

    try {
      const result = await runPythonViaFlask(code)
      setOutput(result.output)
      if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsRunning(false)
    }
  }

  if (hasInput) {
    return <PythonTerminal code={code} />
  }

  return (
    <div className="flex flex-col h-full bg-card" data-testid="python-output">
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">Python Output</h3>
        <Button
          onClick={handleRun}
          disabled={isRunning}
          size="sm"
          className="gap-2"
          data-testid="run-python-code-btn"
          aria-label={isRunning ? 'Running code' : 'Run Python code'}
          aria-busy={isRunning}
        >
          {isRunning ? (
            <>
              <CircleNotch className="animate-spin" size={16} aria-hidden="true" />
              Running...
            </>
          ) : (
            <>
              <Play size={16} weight="fill" aria-hidden="true" />
              Run
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4" role="region" aria-label="Output content">
        {!isRunning && !output && !error && (
          <div
            className="flex items-center justify-center h-full text-muted-foreground text-sm"
            data-testid="empty-output"
            role="status"
          >
            Click &quot;Run&quot; to execute the Python code
          </div>
        )}

        {output && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            data-testid="python-output-card"
            role="region"
            aria-label="Python output result"
          >
            <Card className="p-4 bg-background">
              <pre className="text-sm font-mono whitespace-pre-wrap text-foreground">
                {output || '(no output)'}
              </pre>
            </Card>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
            data-testid="python-error-card"
            role="alert"
          >
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <div className="flex items-start gap-2">
                <Warning size={16} weight="fill" className="text-destructive mt-0.5 shrink-0" aria-hidden="true" />
                <pre className="text-sm font-mono whitespace-pre-wrap text-destructive flex-1">
                  {error}
                </pre>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
