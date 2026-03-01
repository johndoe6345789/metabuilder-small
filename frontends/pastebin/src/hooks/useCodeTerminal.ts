import { useState, useRef } from 'react'
import {
  runCodeViaFlask,
  startInteractiveSession,
  pollSession,
  sendSessionInput,
} from '@/lib/flask-runner'
import { type SnippetFile } from '@/lib/types'
import { appConfig } from '@/lib/config'

// Map from display language name to backend runner key
const languageRunnerMap: Record<string, string> = (appConfig as unknown as { languageRunnerMap: Record<string, string> }).languageRunnerMap ?? {}

function getRunnerKey(language: string): string {
  return languageRunnerMap[language] ?? language.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

// Languages that support interactive stdin (input() polling) — by runner key
const INTERACTIVE_RUNNER_KEYS = new Set(['python'])

export interface TerminalLine {
  type: 'output' | 'error' | 'input-prompt' | 'input-value'
  content: string
  id: string
}

function mapType(backendType: string): TerminalLine['type'] {
  switch (backendType) {
    case 'err':         return 'error'
    case 'prompt':      return 'input-prompt'
    case 'input-echo':  return 'input-value'
    default:            return 'output'
  }
}

const POLL_INTERVAL_MS = 150

export type UseCodeTerminalReturn = ReturnType<typeof useCodeTerminal>

export function useCodeTerminal() {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [waitingForInput, setWaitingForInput] = useState(false)

  const sessionIdRef = useRef<string | null>(null)
  const offsetRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function addLine(type: TerminalLine['type'], content: string) {
    setLines((prev) => [...prev, { type, content, id: `${Date.now()}-${Math.random()}` }])
  }

  function stopPolling() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  async function poll() {
    const sid = sessionIdRef.current
    if (!sid) return

    try {
      const result = await pollSession(sid, offsetRef.current)
      offsetRef.current += result.output.length

      for (const line of result.output) {
        addLine(mapType(line.type), line.text)
      }

      setWaitingForInput(result.waiting_for_input)

      if (result.done) {
        setIsRunning(false)
        stopPolling()
        return
      }
    } catch {
      // transient network error — keep polling
    }

    pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
  }

  const handleRun = async (language: string, files: SnippetFile[], entryPoint?: string) => {
    stopPolling()
    setLines([])
    setWaitingForInput(false)
    setInputValue('')
    offsetRef.current = 0
    sessionIdRef.current = null
    setIsRunning(true)

    const runnerKey = getRunnerKey(language)
    const opts = { language: runnerKey, files, entryPoint }

    try {
      if (INTERACTIVE_RUNNER_KEYS.has(runnerKey)) {
        const sid = await startInteractiveSession(opts)
        sessionIdRef.current = sid
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
      } else {
        const result = await runCodeViaFlask(opts)
        if (result.output) addLine('output', result.output)
        if (result.error) addLine('error', result.error)
        setIsRunning(false)
      }
    } catch (err) {
      addLine('error', err instanceof Error ? err.message : String(err))
      setIsRunning(false)
    }
  }

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const sid = sessionIdRef.current
    if (!waitingForInput || !sid) return

    const value = inputValue
    setInputValue('')
    setWaitingForInput(false)

    try {
      await sendSessionInput(sid, value)
    } catch (err) {
      addLine('error', err instanceof Error ? err.message : String(err))
    }
  }

  const handleStop = () => {
    stopPolling()
    sessionIdRef.current = null
    setIsRunning(false)
    setWaitingForInput(false)
    addLine('error', '[stopped]')
  }

  return {
    lines,
    isRunning,
    isInitializing: false,
    inputValue,
    waitingForInput,
    setInputValue,
    handleInputSubmit,
    handleRun,
    handleStop,
  }
}
