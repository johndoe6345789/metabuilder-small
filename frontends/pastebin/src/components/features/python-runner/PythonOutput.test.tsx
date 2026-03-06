import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PythonOutput } from './PythonOutput'
import * as flaskRunner from '@/lib/flask-runner'

jest.mock('@/lib/flask-runner')
jest.mock('./PythonTerminal', () => ({
  PythonTerminal: () => <div data-testid="python-terminal-mock">Python Terminal</div>,
}))

const mockFlask = flaskRunner as jest.Mocked<typeof flaskRunner>

describe('PythonOutput', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFlask.runPythonViaFlask.mockResolvedValue({ output: '', error: null })
  })

  describe('Rendering', () => {
    it('renders header', () => {
      render(<PythonOutput code="print('hello')" />)
      expect(screen.getByText('Python Output')).toBeInTheDocument()
    })

    it('renders run button', () => {
      render(<PythonOutput code="print('hello')" />)
      expect(screen.getByRole('button', { name: /run python code/i })).toBeInTheDocument()
    })

    it('shows empty state initially', () => {
      render(<PythonOutput code="print('hello')" />)
      expect(screen.getByText(/Click "Run"/i)).toBeInTheDocument()
    })
  })

  describe('Terminal mode detection', () => {
    it('renders PythonTerminal when code contains input()', () => {
      render(<PythonOutput code="name = input('Enter name: ')" />)
      expect(screen.getByTestId('python-terminal-mock')).toBeInTheDocument()
    })

    it('renders output mode when code has no input()', () => {
      render(<PythonOutput code="print('hello')" />)
      expect(screen.queryByTestId('python-terminal-mock')).not.toBeInTheDocument()
    })

    it('detects input() case-insensitively', () => {
      render(<PythonOutput code="INPUT('test')" />)
      expect(screen.getByTestId('python-terminal-mock')).toBeInTheDocument()
    })

    it('switches to terminal mode when code prop changes to include input()', () => {
      const { rerender } = render(<PythonOutput code="print('hello')" />)
      expect(screen.queryByTestId('python-terminal-mock')).not.toBeInTheDocument()

      rerender(<PythonOutput code="name = input('Enter: ')" />)
      expect(screen.getByTestId('python-terminal-mock')).toBeInTheDocument()
    })
  })

  describe('Code execution', () => {
    it('calls runPythonViaFlask with the code', async () => {
      const user = userEvent.setup()
      render(<PythonOutput code="print('hello')" />)

      await user.click(screen.getByRole('button', { name: /run python code/i }))

      await waitFor(() => {
        expect(mockFlask.runPythonViaFlask).toHaveBeenCalledWith("print('hello')")
      })
    })

    it('displays output after successful execution', async () => {
      mockFlask.runPythonViaFlask.mockResolvedValue({ output: 'Hello World', error: null })

      const user = userEvent.setup()
      render(<PythonOutput code="print('Hello World')" />)

      await user.click(screen.getByRole('button', { name: /run python code/i }))

      await waitFor(() => {
        expect(screen.getByText('Hello World')).toBeInTheDocument()
      })
    })

    it('displays error when execution returns an error', async () => {
      mockFlask.runPythonViaFlask.mockResolvedValue({ output: '', error: 'NameError: x is not defined' })

      const user = userEvent.setup()
      render(<PythonOutput code="print(x)" />)

      await user.click(screen.getByRole('button', { name: /run python code/i }))

      await waitFor(() => {
        expect(screen.getByText('NameError: x is not defined')).toBeInTheDocument()
      })
    })

    it('displays error when fetch throws', async () => {
      mockFlask.runPythonViaFlask.mockRejectedValue(new Error('Network failure'))

      const user = userEvent.setup()
      render(<PythonOutput code="print('test')" />)

      await user.click(screen.getByRole('button', { name: /run python code/i }))

      await waitFor(() => {
        expect(screen.getByText('Network failure')).toBeInTheDocument()
      })
    })

    it('disables run button while running', async () => {
      mockFlask.runPythonViaFlask.mockImplementation(() => new Promise(() => {}))

      const user = userEvent.setup()
      render(<PythonOutput code="print('test')" />)

      await user.click(screen.getByRole('button', { name: /run python code/i }))

      expect(screen.getByRole('button', { name: /running code/i })).toBeDisabled()
    })

    it('shows running state text on button', async () => {
      mockFlask.runPythonViaFlask.mockImplementation(() => new Promise(() => {}))

      const user = userEvent.setup()
      render(<PythonOutput code="print('test')" />)

      await user.click(screen.getByRole('button', { name: /run python code/i }))

      expect(screen.getByText('Running...')).toBeInTheDocument()
    })

    it('clears previous output before new execution', async () => {
      mockFlask.runPythonViaFlask
        .mockResolvedValueOnce({ output: 'First output', error: null })
        .mockResolvedValueOnce({ output: 'Second output', error: null })

      const user = userEvent.setup()
      render(<PythonOutput code="print('test')" />)

      await user.click(screen.getByRole('button', { name: /run python code/i }))
      await waitFor(() => expect(screen.getByText('First output')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: /run python code/i }))
      await waitFor(() => {
        expect(screen.getByText('Second output')).toBeInTheDocument()
        expect(screen.queryByText('First output')).not.toBeInTheDocument()
      })
    })

    it('re-enables run button after execution completes', async () => {
      const user = userEvent.setup()
      render(<PythonOutput code="print('test')" />)

      await user.click(screen.getByRole('button', { name: /run python code/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run python code/i })).not.toBeDisabled()
      })
    })

    it('hides empty state once output is available', async () => {
      mockFlask.runPythonViaFlask.mockResolvedValue({ output: 'result', error: null })

      const user = userEvent.setup()
      render(<PythonOutput code="print('test')" />)

      await user.click(screen.getByRole('button', { name: /run python code/i }))

      await waitFor(() => {
        expect(screen.queryByText(/Click "Run"/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge cases', () => {
    it('handles empty code string', () => {
      render(<PythonOutput code="" />)
      expect(screen.getByText('Python Output')).toBeInTheDocument()
    })

    it('handles very long code', () => {
      const longCode = "print('test')\n".repeat(500)
      render(<PythonOutput code={longCode} />)
      expect(screen.getByText('Python Output')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('heading is an h3', () => {
      render(<PythonOutput code="print('hello')" />)
      const heading = screen.getByText('Python Output')
      expect(heading.tagName).toBe('H3')
    })

    it('output region has accessible label', async () => {
      render(<PythonOutput code="print('hello')" />)
      expect(screen.getByRole('region', { name: /output content/i })).toBeInTheDocument()
    })
  })
})
