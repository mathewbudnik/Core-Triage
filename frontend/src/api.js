const BASE = import.meta.env.VITE_API_URL ?? ''

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const getHealth = () => request('GET', '/api/health')
export const triageIntake = (payload) => request('POST', '/api/triage', payload)
export const sendChat = (payload) => request('POST', '/api/chat', payload)
export const getOllamaStatus = () => request('GET', '/api/ollama/status')
export const getSessions = (limit = 50) => request('GET', `/api/sessions?limit=${limit}`)
export const saveSession = (payload) => request('POST', '/api/sessions', payload)
export const fetchSession = (id) => request('GET', `/api/sessions/${id}`)
export const deleteSession = (id) => request('DELETE', `/api/sessions/${id}`)
export const getKbFiles = () => request('GET', '/api/kb')
