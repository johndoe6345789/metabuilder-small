import React from 'react'
import { render, screen } from '@/test-utils'
import { BackendAutoConfigCard } from './BackendAutoConfigCard'

describe('BackendAutoConfigCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete (process.env as any).NEXT_PUBLIC_DBAL_API_URL
  })

  describe('rendering when not configured', () => {
    it('should render nothing when envVarSet is false', () => {
      const { container } = render(
        <BackendAutoConfigCard
          envVarSet={false}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('rendering when configured', () => {
    it('should render card when envVarSet is true', () => {
      render(
        <BackendAutoConfigCard
          envVarSet={true}
        />
      )

      expect(
        screen.getByText('Backend Auto-Configured')
      ).toBeInTheDocument()
    })

    it('should render card title', () => {
      render(
        <BackendAutoConfigCard
          envVarSet={true}
        />
      )

      expect(
        screen.getByText('Backend Auto-Configured')
      ).toBeInTheDocument()
    })

    it('should display config source label', () => {
      render(
        <BackendAutoConfigCard
          envVarSet={true}
        />
      )

      expect(
        screen.getByText('Configuration Source')
      ).toBeInTheDocument()
    })

    it('should display NEXT_PUBLIC_DBAL_API_URL as config source', () => {
      render(
        <BackendAutoConfigCard
          envVarSet={true}
        />
      )

      expect(
        screen.getByText('NEXT_PUBLIC_DBAL_API_URL')
      ).toBeInTheDocument()
    })

    it('should display backend URL label', () => {
      render(
        <BackendAutoConfigCard
          envVarSet={true}
        />
      )

      expect(screen.getByText('Backend URL')).toBeInTheDocument()
    })
  })

  describe('conditional rendering', () => {
    it('should only render when envVarSet changes from false to true', () => {
      const { rerender, container } = render(
        <BackendAutoConfigCard
          envVarSet={false}
        />
      )

      expect(container.firstChild).toBeNull()

      rerender(
        <BackendAutoConfigCard
          envVarSet={true}
        />
      )

      expect(
        screen.getByText('Backend Auto-Configured')
      ).toBeInTheDocument()
    })
  })
})
