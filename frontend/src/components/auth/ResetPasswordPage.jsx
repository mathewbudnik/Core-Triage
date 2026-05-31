import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../../api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await resetPassword(token, password)
      navigate('/login?reset=success', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-12 px-6">
        <h1 className="text-2xl font-semibold mb-3">Invalid reset link</h1>
        <p className="text-gray-600">This link is missing a token. Request a new one.</p>
        <p className="mt-6"><Link to="/forgot-password" className="underline">Request a new link</Link></p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto py-12 px-6 space-y-4">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <p className="text-gray-600 text-sm">
        At least 8 characters, with a number and a symbol.
      </p>
      <input
        type="password"
        required
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-50"
      >
        {busy ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  )
}
