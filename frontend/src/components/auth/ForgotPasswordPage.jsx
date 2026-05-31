import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await forgotPassword(email.trim())
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-12 px-6">
        <h1 className="text-2xl font-semibold mb-3">Check your email</h1>
        <p className="text-gray-600">
          If an account exists for that address, we've sent a password-reset link.
          It expires in 60 minutes.
        </p>
        <p className="mt-6"><Link to="/login" className="underline">Back to sign in</Link></p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto py-12 px-6 space-y-4">
      <h1 className="text-2xl font-semibold">Forgot your password?</h1>
      <p className="text-gray-600">Enter your email and we'll send you a reset link.</p>
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="text-sm"><Link to="/login" className="underline">Back to sign in</Link></p>
    </form>
  )
}
