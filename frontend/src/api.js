import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function client(apiKey) {
  return axios.create({
    baseURL: BASE_URL,
    headers: apiKey ? { 'x-api-key': apiKey } : {},
  })
}

export const api = {
  health: () => axios.get(`${BASE_URL}/health`).then(r => r.data),

  analyze: (apiKey, text, source = 'text') =>
    client(apiKey).post('/analyze', { text, source }).then(r => r.data),

  compare: (apiKey, text) =>
    client(apiKey).post('/compare', { text }).then(r => r.data),

  analyzeDocument: (apiKey, file) => {
    const form = new FormData()
    form.append('file', file)
    return client(apiKey).post('/analyze/document', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  analyzeVoice: (apiKey, blob) => {
    const form = new FormData()
    form.append('file', blob, 'recording.wav')
    return client(apiKey).post('/analyze/voice', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  getLogs: (apiKey, limit = 200) =>
    client(apiKey).get('/logs', { params: { limit } }).then(r => r.data),

  getStats: (apiKey) =>
    client(apiKey).get('/stats').then(r => r.data),

  resetLogs: (apiKey) =>
    client(apiKey).post('/logs/reset').then(r => r.data),

  getThreatIntel: (apiKey) =>
    client(apiKey).get('/threat-intel').then(r => r.data),

  marlUpload: (apiKey, file) => {
    const form = new FormData()
    form.append('file', file)
    return client(apiKey).post('/marl/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  marlState: (apiKey) =>
    client(apiKey).get('/marl/state').then(r => r.data),

  marlTick: (apiKey) =>
    client(apiKey).post('/marl/tick').then(r => r.data),
}

export default api
