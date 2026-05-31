import { useState } from 'react'
import { deleteAccount } from '../../api'

export default function DeleteAccountSection({ onDeleted }) {
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function onConfirm(e) {
    e.preventDefault()
    if (!confirm('Delete your account and all data? This cannot be undone.')) return
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(password)
      sessionStorage.removeItem('ct_token')
      localStorage.removeItem('ct_token')
      onDeleted?.()
      window.location.assign('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border border-red-300 rounded-xl p-4 mt-8">
      <h3 className="font-semibold text-red-700">Delete account</h3>
      <p className="text-sm text-gray-600 mt-1">
        Permanently remove your account and all triage history, training logs,
        and profile data. This action cannot be undone.
      </p>
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 text-sm text-red-700 underline"
        >
          I want to delete my account
        </button>
      ) : (
        <form onSubmit={onConfirm} className="mt-3 space-y-3">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Confirm with your password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-red-600 text-white px-4 py-2 disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg border border-gray-300 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
