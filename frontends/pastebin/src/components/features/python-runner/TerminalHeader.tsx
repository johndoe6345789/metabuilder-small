import { Play, CircleNotch, Terminal as TerminalIcon } from '@phosphor-icons/react'
import { Button } from '@metabuilder/components/fakemui'
import { useTranslation } from '@/hooks/useTranslation'

interface TerminalHeaderProps {
  onRun: () => void
  isRunning: boolean
  isInitializing: boolean
  waitingForInput: boolean
}

export function TerminalHeader({
  onRun,
  isRunning,
  isInitializing,
  waitingForInput
}: TerminalHeaderProps) {
  const t = useTranslation()
  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30" data-testid="terminal-header">
      <div className="flex items-center gap-2">
        <TerminalIcon size={18} weight="bold" className="text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">{t.pythonTerminal.title}</h3>
      </div>
      <Button
        onClick={onRun}
        disabled={isRunning || isInitializing || waitingForInput}
        size="sm"
        className="gap-2"
        data-testid="run-python-btn"
        aria-label={isRunning ? t.pythonTerminal.runningAria : isInitializing ? t.pythonTerminal.loadingAria : t.pythonTerminal.runAria}
        aria-busy={isRunning || isInitializing}
      >
        {isRunning || isInitializing ? (
          <>
            <CircleNotch className="animate-spin" size={16} aria-hidden="true" />
            {isInitializing ? t.pythonTerminal.loading : t.pythonTerminal.running}
          </>
        ) : (
          <>
            <Play size={16} weight="fill" aria-hidden="true" />
            {t.pythonTerminal.run}
          </>
        )}
      </Button>
    </div>
  )
}
