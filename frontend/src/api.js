const BASE = import.meta.env.VITE_API_URL ?? ''

function getToken() {
  return sessionStorage.getItem('ct_token') ?? localStorage.getItem('ct_token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const opts = { method, headers }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)

  // 401 from an authenticated request → token expired or invalid.
  // Clear local credentials and notify the app to drop the user back to signed-out state.
  if (res.status === 401 && token && path !== '/api/auth/login' && path !== '/api/auth/register') {
    sessionStorage.removeItem('ct_token')
    localStorage.removeItem('ct_token')
    window.dispatchEvent(new CustomEvent('ct:auth-expired'))
    throw new Error('Your session expired. Please sign in again.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err.detail
    let message
    if (Array.isArray(detail)) {
      // FastAPI 422 validation errors: [{loc, msg, type}, ...]
      message = detail.map(e => {
        const field = Array.isArray(e.loc) ? e.loc.slice(-1)[0] : 'field'
        return `${field}: ${e.msg ?? JSON.stringify(e)}`
      }).join('; ')
    } else {
      message = typeof detail === 'string' ? detail : `Error ${res.status}: ${res.statusText}`
    }
    throw new Error(message || 'Request failed')
  }
  return res.json()
}

export const getHealth = () => request('GET', '/api/health')
export const triageIntake = (payload) => request('POST', '/api/triage', payload)
export const sendChat = (payload) => request('POST', '/api/chat', payload)
export const getSessions = (limit = 50) => request('GET', `/api/sessions?limit=${limit}`)
export const saveSession = (payload) => request('POST', '/api/sessions', payload)
export const fetchSession = (id) => request('GET', `/api/sessions/${id}`)
export const deleteSession = (id) => request('DELETE', `/api/sessions/${id}`)
export const getKbFiles = () => request('GET', '/api/kb')

// Auth
export const authRegister = (payload) => request('POST', '/api/auth/register', payload)
export const authLogin = (payload) => request('POST', '/api/auth/login', payload)
export const getMe = () => request('GET', '/api/auth/me')
export const acceptDisclaimer = () => request('POST', '/api/auth/disclaimer', {})
export const verifyEmail = (token) => request('POST', '/api/auth/verify-email', { token })
export const resendVerification = () => request('POST', '/api/auth/resend-verification', {})

// Profile
export const saveProfile = (payload) => request('POST', '/api/profile', payload)
export const getProfile = () => request('GET', '/api/profile')

// Plans
export const generatePlan = (payload = {}) => request('POST', '/api/plans/generate', payload)
export const getActivePlan = () => request('GET', '/api/plans/active')

// Training log
export const logTraining = (payload) => request('POST', '/api/training', payload)
export const getTrainingLogs = (limit = 30) => request('GET', `/api/training?limit=${limit}`)

// Train stats + leaderboard
export const getTrainingStats = () => request('GET', '/api/training/stats')
export const getLeaderboard = ({ window = 'week', cohort, limit = 10 } = {}) => {
  const params = new URLSearchParams({ window, limit })
  if (cohort) params.set('cohort', cohort)
  return request('GET', `/api/training/leaderboard?${params}`)
}

// Display name + leaderboard privacy + avatar customization
export const setDisplayName       = (name)   => request('PATCH', '/api/auth/me/display-name',       { display_name: name })
export const setLeaderboardPrivate = (priv)  => request('PATCH', '/api/auth/me/leaderboard-private', { private: !!priv })
export const setAvatar             = ({ icon = null, color = null } = {}) =>
  request('PATCH', '/api/auth/me/avatar', { icon, color })

// Billing (Stripe)
export const createCheckoutSession = (product) => request('POST', '/api/billing/checkout-session', { product })
export const openBillingPortal = () => request('POST', '/api/billing/portal', {})

// Coach messaging (user)
export const sendCoachMessage = (content) => request('POST', '/api/coach/message', { content })
export const getCoachThread = () => request('GET', '/api/coach/thread')

// Coach inbox (admin)
export const adminGetThreads = () => request('GET', '/api/admin/coach/threads')
export const adminGetMessages = (threadId) => request('GET', `/api/admin/coach/threads/${threadId}/messages`)
export const adminReply = (thread_id, content) => request('POST', '/api/admin/coach/reply', { thread_id, content })
