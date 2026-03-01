'use client'

import { useRef, useEffect } from 'react'
import { useCodeTerminal } from '@/hooks/useCodeTerminal'
import { TerminalHeader } from '@/components/features/python-runner/TerminalHeader'
import { TerminalOutput } from '@/components/features/python-runner/TerminalOutput'
import { TerminalInput } from '@/components/features/python-runner/TerminalInput'
import { type SnippetFile } from '@/lib/types'
import { appConfig } from '@/lib/config'

// Runner keys that support interactive stdin
const INTERACTIVE_RUNNER_KEYS = new Set(['python'])
const languageRunnerMap: Record<string, string> = (appConfig as unknown as { languageRunnerMap: Record<string, string> }).languageRunnerMap ?? {}
const getRunnerKey = (lang: string) => languageRunnerMap[lang] ?? lang.toLowerCase().replace(/[^a-z0-9]+/g, '-')

interface CodeTerminalProps {
  language: string
  files: SnippetFile[]
  entryPoint?: string
}

export function CodeTerminal({ language, files, entryPoint }: CodeTerminalProps) {
  const {
    lines,
    isRunning,
    isInitializing,
    inputValue,
    waitingForInput,
    setInputValue,
    handleInputSubmit,
    handleRun,
  } = useCodeTerminal()

  const terminalEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const hasErrors = lines.some((line) => line.type === 'error')
  const supportsInteractive = INTERACTIVE_RUNNER_KEYS.has(getRunnerKey(language))

  return (
    <div className="flex flex-col h-full bg-card" data-testid="code-terminal">
      <TerminalHeader
        onRun={() => handleRun(language, files, entryPoint)}
        isRunning={isRunning}
        isInitializing={isInitializing}
        waitingForInput={waitingForInput && supportsInteractive}
      />

      <div
        className="sr-only"
        role="status"
        aria-live={hasErrors ? 'assertive' : 'polite'}
        aria-atomic="true"
        data-testid="terminal-status"
      >
        {isRunning && 'Code is running'}
        {isInitializing && 'Terminal is initializing'}
        {waitingForInput && supportsInteractive && 'Waiting for user input'}
        {!isRunning && !isInitializing && lines.length > 0 && `${lines.length} lines of output`}
        {hasErrors && 'Errors detected in output'}
      </div>

      <div
        className="flex-1 overflow-auto p-4 font-mono text-sm bg-background/50"
        data-testid="terminal-output-area"
        role="region"
        aria-label="Terminal output"
        aria-live="polite"
        aria-atomic="false"
      >
        <TerminalOutput lines={lines} isRunning={isRunning} />
        {supportsInteractive && (
          <TerminalInput
            waitingForInput={waitingForInput}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSubmit={handleInputSubmit}
          />
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  )
}
