// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PyodideInterface = any
// NOTE: `any` is intentional here. Pyodide's actual type (`typeof PyodideAPI_`) uses `PyProxy`
// for `globals`, which does not structurally match any reasonable TypeScript interface we can
// define without re-exporting the full Pyodide type hierarchy. Additionally, test mocks assign
// `Record<string, unknown>` directly to the module-level `pyodideLoading`/`pyodideInstance`
// variables. Defining a stricter interface breaks both the Pyodide type assignment and the
// existing test infrastructure. `runPython` and `runPythonAsync` return arbitrary Python values,
// making `any` the only accurate return type. A minimal interface would provide no real safety
// benefit while creating spurious type errors against the library's own types.

// Pyodide runtime files are served from public/pyodide/ (copied from node_modules/pyodide at build
// time). webpack externalises import('pyodide') as a native browser ESM import of pyodide.mjs so
// webpack's chunk loader never intercepts pyodide's own internal fetches for asm.js / wasm / stdlib.
const PYODIDE_INDEX_URL = '/pastebin/pyodide/'

let pyodideInstance: PyodideInterface | null = null
let pyodideLoading: Promise<PyodideInterface> | null = null
let initializationError: Error | null = null

export async function getPyodide(): Promise<PyodideInterface> {
  if (typeof window === 'undefined') {
    throw new Error('Pyodide is browser-only')
  }

  // If we had an initialization error, throw it
  if (initializationError) {
    throw initializationError
  }

  if (pyodideInstance) {
    return pyodideInstance
  }

  if (pyodideLoading) {
    return pyodideLoading
  }

  try {
    const { loadPyodide } = await import('pyodide')

    pyodideLoading = loadPyodide({
      indexURL: PYODIDE_INDEX_URL,
    }).then((pyodide) => {
      pyodideInstance = pyodide
      initializationError = null
      return pyodide
    }).catch((err) => {
      initializationError = err instanceof Error ? err : new Error(String(err))
      pyodideLoading = null
      throw initializationError
    })

    return pyodideLoading
  } catch (err) {
    initializationError = err instanceof Error ? err : new Error(String(err))
    pyodideLoading = null
    throw initializationError
  }
}

export async function runPythonCode(code: string): Promise<{ output?: string; error?: string }> {
  try {
    const pyodide = await getPyodide()

    // Reset stdout/stderr for each run
    pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`)

    try {
      const result = await pyodide.runPythonAsync(code)

      // Flush and collect stdout/stderr after async execution
      const stdout = pyodide.runPython('sys.stdout.getvalue()')
      const stderr = pyodide.runPython('sys.stderr.getvalue()')

      let output = stdout || ''
      if (stderr) {
        output += (output ? '\n' : '') + stderr
      }
      if (result !== undefined && result !== null && String(result) !== 'None') {
        output += (output ? '\n' : '') + String(result)
      }

      return { output: output || '(no output)' }
    } catch (runErr) {
      // Get any stderr output that might have been captured
      let stderr = ''
      try {
        stderr = pyodide.runPython('sys.stderr.getvalue()')
      } catch {
        // Ignore errors getting stderr
      }

      const errorMessage = runErr instanceof Error ? runErr.message : String(runErr)
      return {
        output: '',
        error: stderr ? `${stderr}\n${errorMessage}` : errorMessage
      }
    }
  } catch (err) {
    return {
      output: '',
      error: `Python environment error: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}

export interface InteractiveCallbacks {
  onOutput?: (text: string) => void
  onError?: (text: string) => void
  onInputRequest?: (prompt: string) => Promise<string>
}

export async function runPythonCodeInteractive(
  code: string,
  callbacks: InteractiveCallbacks
): Promise<void> {
  const pyodide = await getPyodide()

  // Set up interactive stdout/stderr handlers
  pyodide.runPython(`
import sys
from io import StringIO

class InteractiveStdout:
    def __init__(self, callback):
        self.callback = callback
        self.buffer = ""

    def write(self, text):
        self.buffer += text
        if "\\n" in text:
            lines = self.buffer.split("\\n")
            for line in lines[:-1]:
                if line:
                    self.callback(line)
            self.buffer = lines[-1]
        return len(text)

    def flush(self):
        if self.buffer:
            self.callback(self.buffer)
            self.buffer = ""

class InteractiveStderr:
    def __init__(self, callback):
        self.callback = callback
        self.buffer = ""

    def write(self, text):
        self.buffer += text
        if "\\n" in text:
            lines = self.buffer.split("\\n")
            for line in lines[:-1]:
                if line:
                    self.callback(line)
            self.buffer = lines[-1]
        return len(text)

    def flush(self):
        if self.buffer:
            self.callback(self.buffer)
            self.buffer = ""
`)

  const outputCallback = (text: string) => {
    if (callbacks.onOutput) {
      callbacks.onOutput(text)
    }
  }

  const errorCallback = (text: string) => {
    if (callbacks.onError) {
      callbacks.onError(text)
    }
  }

  pyodide.globals.set('__output_callback__', outputCallback)
  pyodide.globals.set('__error_callback__', errorCallback)

  pyodide.runPython(`
sys.stdout = InteractiveStdout(__output_callback__)
sys.stderr = InteractiveStderr(__error_callback__)
`)

  const customInput = async (prompt = '') => {
    if (callbacks.onInputRequest) {
      const value = await callbacks.onInputRequest(prompt)
      return value
    }
    return ''
  }

  pyodide.globals.set('js_input_handler', customInput)

  // Set up custom input function using asyncio.run() which is the modern approach
  await pyodide.runPythonAsync(`
import builtins
from pyodide.ffi import to_js
import asyncio

async def async_input(prompt=""):
    import sys
    sys.stdout.write(prompt)
    sys.stdout.flush()
    result = await js_input_handler(prompt)
    return result

def custom_input(prompt=""):
    import asyncio
    try:
        # Try to get the running loop (works in async context)
        loop = asyncio.get_running_loop()
        # If we're in an async context, we need to use a different approach
        import pyodide.webloop
        future = asyncio.ensure_future(async_input(prompt))
        return pyodide.webloop.WebLoop().run_until_complete(future)
    except RuntimeError:
        # No running loop, create a new one
        return asyncio.run(async_input(prompt))

builtins.input = custom_input
`)

  try {
    await pyodide.runPythonAsync(code)

    pyodide.runPython('sys.stdout.flush()')
    pyodide.runPython('sys.stderr.flush()')
  } catch (err) {
    if (callbacks.onError) {
      callbacks.onError(err instanceof Error ? err.message : String(err))
    }
    throw err
  }
}

export function isPyodideReady(): boolean {
  return pyodideInstance !== null
}

export function getPyodideError(): Error | null {
  return initializationError
}

export function resetPyodide(): void {
  pyodideInstance = null
  pyodideLoading = null
  initializationError = null
}
