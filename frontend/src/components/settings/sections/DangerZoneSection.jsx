import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import SettingsSection from '../SettingsSection'
import { deleteAccount } from '../../../api'

export default function DangerZoneSection({ onDeleted, onToast }) {
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
      setError(err.message || 'Could not delete account.')
      onToast?.({ kind: 'error', message: err.message || 'Could not delete account.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsSection id="danger" icon={AlertTriangle} title="Danger zone" sub="Irreversible account actions." tone="danger">
      <div className="relative z-[1] flex items-center justify-between gap-4 flex-wrap p-4 rounded-2xl bg-black/30 border border-red-500/20">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-ct-cream">Delete account</div>
          <div className="text-xs text-ct-cream/50 mt-1 max-w-lg">
            Permanently remove your account and all triage history, training logs, sessions, and profile data. This cannot be undone.
          </div>
        </div>

        {!expanded ? (
          <button onClick={() => setExpanded(true)} className="px-4 py-2.5 rounded-xl bg-red-500 text-ct-cream text-sm font-bold border border-red-500 hover:bg-red-600" style={{ boxShadow: '0 6px 18px -6px rgba(244,114,114,0.5)' }}>
            I want to delete
          </button>
        ) : (
          <form onSubmit={onConfirm} className="flex items-center gap-2 flex-wrap">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm password" className="bg-black/30 border border-ct-hairline rounded-lg px-3 py-2 text-sm text-ct-cream focus:border-red-500/50 focus:outline-none w-48" />
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-red-500 text-ct-cream text-sm font-bold disabled:opacity-50">
              {busy ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button type="button" onClick={() => { setExpanded(false); setPassword(''); setError(null) }} className="px-4 py-2 rounded-lg border border-ct-hairline text-ct-cream/70 text-sm">
              Cancel
            </button>
          </form>
        )}
      </div>

      {error && <p className="relative z-[1] mt-3 text-xs text-red-400">{error}</p>}
    </SettingsSection>
  )
}
