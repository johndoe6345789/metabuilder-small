export interface PythonRunResult {
  output: string
  error: string | null
}

export interface SessionOutputLine {
  type: 'out' | 'err' | 'prompt' | 'input-echo'
  text: string
}

export interface PollResult {
  output: SessionOutputLine[]
  waiting_for_input: boolean
  done: boolean
}

function getFlaskBaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_FLASK_BACKEND_URL?.replace(/\/$/, '') ?? null
}

function requireUrl(): string {
  const url = getFlaskBaseUrl()
  if (!url) throw new Error('Flask backend not configured (NEXT_PUBLIC_FLASK_BACKEND_URL is not set)')
  return url
}

// ---------------------------------------------------------------------------
// Non-interactive run
// ---------------------------------------------------------------------------

export async function runPythonViaFlask(code: string): Promise<PythonRunResult> {
  const base = requireUrl()
  const response = await fetch(`${base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok && response.status !== 408) {
    throw new Error(`Server error: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    output: data.output ?? '',
    error: data.error ?? null,
  }
}

// ---------------------------------------------------------------------------
// Interactive session
// ---------------------------------------------------------------------------

export async function startInteractiveSession(code: string): Promise<string> {
  const base = requireUrl()
  const response = await fetch(`${base}/api/run/interactive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`Failed to start session: ${response.statusText}`)
  const data = await response.json()
  return data.session_id as string
}

export async function pollSession(sessionId: string, offset: number): Promise<PollResult> {
  const base = requireUrl()
  const response = await fetch(
    `${base}/api/run/interactive/${sessionId}/poll?offset=${offset}`,
    { signal: AbortSignal.timeout(5000) }
  )
  if (!response.ok) throw new Error(`Poll failed: ${response.statusText}`)
  return response.json()
}

export async function sendSessionInput(sessionId: string, value: string): Promise<void> {
  const base = requireUrl()
  const response = await fetch(`${base}/api/run/interactive/${sessionId}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`Send input failed: ${response.statusText}`)
}

export function isFlaskRunnerAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FLASK_BACKEND_URL)
}
