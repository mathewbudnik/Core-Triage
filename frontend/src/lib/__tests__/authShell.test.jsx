import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthShell from '../../components/auth/AuthShell'

describe('AuthShell', () => {
  it('renders eyebrow, title, subtitle, and helper', () => {
    render(
      <MemoryRouter>
        <AuthShell
          eyebrow="ACCOUNT RECOVERY"
          title="Forgot password?"
          subtitle="Enter your email."
          helper={<span>Back to sign in</span>}
        >
          <input aria-label="Email" />
        </AuthShell>
      </MemoryRouter>
    )
    expect(screen.getByText('ACCOUNT RECOVERY')).toBeInTheDocument()
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    expect(screen.getByText('Enter your email.')).toBeInTheDocument()
    expect(screen.getByText('Back to sign in')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })
})
