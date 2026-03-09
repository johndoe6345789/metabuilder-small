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

export interface RunFileMap {
  originalName: string
  uuidName: string
}

export interface RunDebugInfo {
  language: string
  runnerKey: string
  interactive: boolean
  files: RunFileMap[]
  entryPointOriginal: string
  entryPointSent: string
  startedAt: number
}

/** Assign UUID names to files and resolve the entry point — mirrors backend logic. */
function safeFilesAndEntry(
  files: SnippetFile[],
  entryPoint: string,
): { safeFiles: SnippetFile[]; resolvedEntry: string; fileMap: RunFileMap[] } {
  const nameMap = new Map<string, string>()  // original → uuid
  const stemMap = new Map<string, string>()  // stem     → uuid
  const safeFiles: SnippetFile[] = []
  const fileMap: RunFileMap[] = []

  for (const f of files) {
    const basename = f.name.split('/').pop() ?? f.name
    const dotIdx = basename.lastIndexOf('.')
    const ext = dotIdx >= 0 ? basename.slice(dotIdx).toLowerCase().replace(/[^a-z0-9.]/g, '') : ''
    const uid = crypto.randomUUID().replace(/-/g, '') + ext
    nameMap.set(f.name, uid)
    const stem = dotIdx >= 0 ? basename.slice(0, dotIdx) : basename
    if (!stemMap.has(stem)) stemMap.set(stem, uid)
    safeFiles.push({ name: uid, content: f.content })
    fileMap.push({ originalName: f.name, uuidName: uid })
  }

  let resolvedEntry: string
  if (nameMap.has(entryPoint)) {
    resolvedEntry = nameMap.get(entryPoint)!
  } else if (stemMap.has(entryPoint)) {
    resolvedEntry = stemMap.get(entryPoint)!
  } else {
    resolvedEntry = safeFiles[0]?.name ?? entryPoint
  }

  return { safeFiles, resolvedEntry, fileMap }
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
  const [lastRunInfo, setLastRunInfo] = useState<RunDebugInfo | null>(null)

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
    const isInteractive = INTERACTIVE_RUNNER_KEYS.has(runnerKey)
    const { safeFiles, resolvedEntry, fileMap } = safeFilesAndEntry(files, entryPoint ?? '')
    const opts = { language: runnerKey, files: safeFiles, entryPoint: resolvedEntry }

    setLastRunInfo({
      language,
      runnerKey,
      interactive: isInteractive,
      files: fileMap,
      entryPointOriginal: entryPoint ?? '',
      entryPointSent: resolvedEntry,
      startedAt: Date.now(),
    })

    try {
      if (isInteractive) {
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
    lastRunInfo,
    setInputValue,
    handleInputSubmit,
    handleRun,
    handleStop,
  }
}
