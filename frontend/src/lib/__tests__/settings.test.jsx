import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from '../../components/settings/SettingsPage'

vi.mock('../../api', () => ({
  getProfile: vi.fn().mockResolvedValue({}),
  getTrainingStats: vi.fn().mockResolvedValue({ all: { sessions: 0 } }),
  resendVerification: vi.fn(),
  setDisplayName: vi.fn(),
  saveBodyMeasurements: vi.fn(),
  saveProfile: vi.fn(),
  setLeaderboardPrivate: vi.fn(),
  deleteAccount: vi.fn(),
  openBillingPortal: vi.fn(),
}))

describe('SettingsPage', () => {
  it('renders all 8 section headings', () => {
    const user = {
      id: 1, email: 'x@example.com', display_name: 'tester',
      email_verified: true, leaderboard_private: false,
      subscription_state: { state: 'trial', days_remaining: 12 },
    }
    render(
      <MemoryRouter>
        <SettingsPage user={user} onUserChange={vi.fn()} onLogout={vi.fn()} onToast={vi.fn()} onUpgradeClick={vi.fn()} />
      </MemoryRouter>
    )
    // h1 page title
    expect(screen.getByRole('heading', { name: /Make it/i })).toBeInTheDocument()
    // h3 section titles (inside SettingsSection) — use heading role to avoid
    // matching sidebar nav links that share the same text
    expect(screen.getByRole('heading', { name: 'Climbing profile' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Visibility' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your data' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Danger zone' })).toBeInTheDocument()
  })
})
