export interface PythonRunResult {
  output: string
  error: string | null
}

function getFlaskBaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_FLASK_BACKEND_URL?.replace(/\/$/, '') ?? null
}

export async function runPythonViaFlask(code: string): Promise<PythonRunResult> {
  const baseUrl = getFlaskBaseUrl()
  if (!baseUrl) {
    throw new Error('Flask backend not configured (NEXT_PUBLIC_FLASK_BACKEND_URL is not set)')
  }

  const response = await fetch(`${baseUrl}/api/run`, {
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

export function isFlaskRunnerAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FLASK_BACKEND_URL)
}
