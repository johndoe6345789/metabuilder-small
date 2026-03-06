import { renderHook, act, waitFor } from '@testing-library/react'
import { usePythonTerminal } from './usePythonTerminal'
import * as flaskRunner from '@/lib/flask-runner'

jest.mock('@/lib/flask-runner')

const mockFlask = flaskRunner as jest.Mocked<typeof flaskRunner>

function doneResult(lines: flaskRunner.SessionOutputLine[] = []) {
  return { output: lines, waiting_for_input: false, done: true }
}

function pendingResult(lines: flaskRunner.SessionOutputLine[] = [], waiting = false) {
  return { output: lines, waiting_for_input: waiting, done: false }
}

describe('usePythonTerminal', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockFlask.startInteractiveSession.mockResolvedValue('session-abc')
    mockFlask.pollSession.mockResolvedValue(doneResult())
    mockFlask.sendSessionInput.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('initial state', () => {
    it('starts with empty lines and not running', () => {
      const { result } = renderHook(() => usePythonTerminal())
      expect(result.current.lines).toEqual([])
      expect(result.current.isRunning).toBe(false)
      expect(result.current.isInitializing).toBe(false)
      expect(result.current.waitingForInput).toBe(false)
      expect(result.current.inputValue).toBe('')
    })

    it('isInitializing is always false (no Pyodide)', () => {
      const { result } = renderHook(() => usePythonTerminal())
      expect(result.current.isInitializing).toBe(false)
    })
  })

  describe('handleRun', () => {
    it('calls startInteractiveSession with language=python and the code', async () => {
      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('print("hi")')
        await jest.runAllTimersAsync()
      })

      expect(mockFlask.startInteractiveSession).toHaveBeenCalledWith({
        language: 'python',
        files: [{ name: 'main.py', content: 'print("hi")' }],
      })
    })

    it('sets isRunning=true while session is active', async () => {
      mockFlask.startInteractiveSession.mockResolvedValue('sess-1')
      mockFlask.pollSession.mockResolvedValue(pendingResult())

      const { result } = renderHook(() => usePythonTerminal())

      act(() => {
        result.current.handleRun('import time; time.sleep(10)')
      })

      await waitFor(() => expect(result.current.isRunning).toBe(true))
    })

    it('clears previous lines when starting a new run', async () => {
      mockFlask.pollSession
        .mockResolvedValueOnce(doneResult([{ type: 'out', text: 'First' }]))
        .mockResolvedValue(doneResult())

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('print("First")')
        await jest.runAllTimersAsync()
      })

      await waitFor(() => expect(result.current.lines).toHaveLength(1))

      await act(async () => {
        await result.current.handleRun('print("Second")')
        await jest.runAllTimersAsync()
      })

      await waitFor(() => expect(result.current.lines).toHaveLength(0))
    })

    it('resets offset and sessionId on new run', async () => {
      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('print("a")')
        await jest.runAllTimersAsync()
      })

      expect(mockFlask.pollSession).toHaveBeenCalledWith('session-abc', 0)
    })

    it('shows error line when startInteractiveSession throws', async () => {
      mockFlask.startInteractiveSession.mockRejectedValue(new Error('Connection refused'))

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('print("test")')
      })

      await waitFor(() => {
        expect(result.current.lines).toHaveLength(1)
        expect(result.current.lines[0].type).toBe('error')
        expect(result.current.lines[0].content).toBe('Connection refused')
      })
    })

    it('sets isRunning=false after error from startInteractiveSession', async () => {
      mockFlask.startInteractiveSession.mockRejectedValue(new Error('fail'))

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('code')
      })

      await waitFor(() => expect(result.current.isRunning).toBe(false))
    })
  })

  describe('polling', () => {
    it('appends output lines from poll results', async () => {
      mockFlask.pollSession.mockResolvedValue(
        doneResult([
          { type: 'out', text: 'Hello' },
          { type: 'out', text: 'World' },
        ])
      )

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('print("Hello\\nWorld")')
        await jest.runAllTimersAsync()
      })

      await waitFor(() => expect(result.current.lines).toHaveLength(2))
      expect(result.current.lines[0].content).toBe('Hello')
      expect(result.current.lines[1].content).toBe('World')
    })

    it('maps err type to error terminal line type', async () => {
      mockFlask.pollSession.mockResolvedValue(
        doneResult([{ type: 'err', text: 'SyntaxError: bad code' }])
      )

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('bad code')
        await jest.runAllTimersAsync()
      })

      await waitFor(() => expect(result.current.lines).toHaveLength(1))
      expect(result.current.lines[0].type).toBe('error')
    })

    it('maps prompt type to input-prompt terminal line type', async () => {
      mockFlask.pollSession.mockResolvedValue(
        doneResult([{ type: 'prompt', text: 'Enter value: ' }])
      )

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun("x = input('Enter value: ')")
        await jest.runAllTimersAsync()
      })

      await waitFor(() => expect(result.current.lines).toHaveLength(1))
      expect(result.current.lines[0].type).toBe('input-prompt')
    })

    it('maps input-echo type to input-value terminal line type', async () => {
      mockFlask.pollSession.mockResolvedValue(
        doneResult([{ type: 'input-echo', text: 'hello' }])
      )

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('input()')
        await jest.runAllTimersAsync()
      })

      await waitFor(() => expect(result.current.lines).toHaveLength(1))
      expect(result.current.lines[0].type).toBe('input-value')
    })

    it('sets isRunning=false when poll returns done=true', async () => {
      mockFlask.pollSession.mockResolvedValue(doneResult())

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('print("done")')
        await jest.runAllTimersAsync()
      })

      await waitFor(() => expect(result.current.isRunning).toBe(false))
    })

    it('continues polling while done=false', async () => {
      mockFlask.pollSession
        .mockResolvedValueOnce(pendingResult([{ type: 'out', text: 'step 1' }]))
        .mockResolvedValueOnce(doneResult([{ type: 'out', text: 'step 2' }]))

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('multi-step code')
        await jest.runAllTimersAsync()
      })

      await waitFor(() => expect(result.current.lines).toHaveLength(2))
      expect(mockFlask.pollSession).toHaveBeenCalledTimes(2)
    })

    it('advances offset between poll calls', async () => {
      mockFlask.pollSession
        .mockResolvedValueOnce(pendingResult([{ type: 'out', text: 'a' }, { type: 'out', text: 'b' }]))
        .mockResolvedValueOnce(doneResult([{ type: 'out', text: 'c' }]))

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('code')
        await jest.runAllTimersAsync()
      })

      expect(mockFlask.pollSession).toHaveBeenNthCalledWith(1, 'session-abc', 0)
      expect(mockFlask.pollSession).toHaveBeenNthCalledWith(2, 'session-abc', 2)
    })

    it('sets waitingForInput when poll says waiting_for_input=true', async () => {
      mockFlask.pollSession
        .mockResolvedValueOnce(pendingResult([], true))
        .mockResolvedValue(doneResult())

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun("input('>')")
        await jest.advanceTimersByTimeAsync(200)
      })

      await waitFor(() => expect(result.current.waitingForInput).toBe(true))
    })

    it('ignores transient poll errors and keeps polling', async () => {
      mockFlask.pollSession
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce(doneResult([{ type: 'out', text: 'recovered' }]))

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun('code')
        await jest.runAllTimersAsync()
      })

      await waitFor(() => expect(result.current.lines).toHaveLength(1))
      expect(result.current.lines[0].content).toBe('recovered')
    })
  })

  describe('handleInputSubmit', () => {
    it('does nothing when not waiting for input', async () => {
      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        result.current.setInputValue('some value')
        await result.current.handleInputSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })

      expect(mockFlask.sendSessionInput).not.toHaveBeenCalled()
    })

    it('calls sendSessionInput with the current input value', async () => {
      mockFlask.pollSession
        .mockResolvedValueOnce(pendingResult([], true))
        .mockResolvedValue(doneResult())

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun("input('>')")
        await jest.advanceTimersByTimeAsync(200)
      })

      await waitFor(() => expect(result.current.waitingForInput).toBe(true))

      // Set input value first, then submit in a separate act so state flushes
      act(() => { result.current.setInputValue('Alice') })
      await waitFor(() => expect(result.current.inputValue).toBe('Alice'))

      await act(async () => {
        await result.current.handleInputSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })

      expect(mockFlask.sendSessionInput).toHaveBeenCalledWith('session-abc', 'Alice')
    })

    it('clears inputValue after submit', async () => {
      mockFlask.pollSession
        .mockResolvedValueOnce(pendingResult([], true))
        .mockResolvedValue(doneResult())

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun("input('>')")
        await jest.advanceTimersByTimeAsync(200)
      })

      await waitFor(() => expect(result.current.waitingForInput).toBe(true))

      act(() => { result.current.setInputValue('hello') })
      await waitFor(() => expect(result.current.inputValue).toBe('hello'))

      await act(async () => {
        await result.current.handleInputSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })

      expect(result.current.inputValue).toBe('')
    })

    it('shows error line when sendSessionInput throws', async () => {
      mockFlask.pollSession
        .mockResolvedValueOnce(pendingResult([], true))
        .mockResolvedValue(doneResult())
      mockFlask.sendSessionInput.mockRejectedValue(new Error('Send failed'))

      const { result } = renderHook(() => usePythonTerminal())

      await act(async () => {
        await result.current.handleRun("input('>')")
        await jest.advanceTimersByTimeAsync(200)
      })

      await waitFor(() => expect(result.current.waitingForInput).toBe(true))

      act(() => { result.current.setInputValue('test') })
      await waitFor(() => expect(result.current.inputValue).toBe('test'))

      await act(async () => {
        await result.current.handleInputSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })

      await waitFor(() => {
        const errorLines = result.current.lines.filter((l) => l.type === 'error')
        expect(errorLines.length).toBeGreaterThan(0)
        expect(errorLines[errorLines.length - 1].content).toBe('Send failed')
      })
    })
  })

  describe('setInputValue', () => {
    it('updates inputValue', () => {
      const { result } = renderHook(() => usePythonTerminal())

      act(() => {
        result.current.setInputValue('new value')
      })

      expect(result.current.inputValue).toBe('new value')
    })
  })
})
