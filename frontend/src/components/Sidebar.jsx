import { useState } from 'react'
import api from '../api'

export default function Sidebar({ apiKey, setApiKey, backendUrl, health }) {
  const [marlLoaded, setMarlLoaded] = useState(false)
  const [marlState, setMarlState] = useState(null)
  const [marlError, setMarlError] = useState(null)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setMarlError(null)
    try {
      await api.marlUpload(apiKey, file)
      setMarlLoaded(true)
      const s = await api.marlState(apiKey)
      setMarlState(s)
    } catch (err) {
      setMarlError(err.response?.data?.detail || err.message)
    }
  }

  const handleTick = async () => {
    try {
      const result = await api.marlTick(apiKey)
      setMarlState(result.state)
    } catch (err) {
      setMarlError(err.response?.data?.detail || err.message)
    }
  }

  return (
    <div className="sidebar">
      <h3>Settings</h3>
      <label className="hint-text">API Key</label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Enter your API key"
      />
      <p className="hint-text">
        Backend: {backendUrl}<br />
        Status: {health ? (health.status === 'ok' ? '🟢 Connected' : '🔴 Error') : '⏳ Checking...'}
      </p>

      <hr style={{ borderColor: '#1f3a52', margin: '16px 0' }} />

      <h3>🕸️ Network Defense Layer</h3>
      <p className="hint-text">
        Your trained MARL model manages device/agent isolation on its own simulated graph.
        It cannot read prompt text directly.
      </p>
      <input type="file" accept=".npy" onChange={handleUpload} />
      {marlError && <p className="error-text">{marlError}</p>}

      {marlLoaded && marlState && (
        <div style={{ marginTop: 12 }}>
          <p className="hint-text">Device/agent status</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: marlState.n_devices }).map((_, i) => (
              <span key={i}>
                {marlState.isolated.includes(i) ? '🔴' : (i === marlState.compromised_idx && marlState.injection ? '🟡' : '🟢')}
              </span>
            ))}
          </div>
          <p className="hint-text">Quarantined: {marlState.isolated.length} · Step: {marlState.step}</p>
          <button className="secondary" onClick={handleTick}>Tick network layer</button>
        </div>
      )}
    </div>
  )
}
