import { useState } from 'react'
import api from '../api'

export default function NetworkLayer({ apiKey }) {
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
    <div className="card" style={{ maxWidth: 520 }}>
      <h3>Network Defense Layer</h3>
      <p className="hint-text">
        Your trained MARL model manages device/agent isolation on its own simulated graph.
        It cannot read prompt text directly — that decision comes entirely from the layers
        on the Live Firewall page.
      </p>
      <label className="hint-text">Upload defender model (.npy)</label>
      <input type="file" accept=".npy" onChange={handleUpload} style={{ marginTop: 6 }} />
      {marlError && <p className="error-text" style={{ marginTop: 8 }}>{marlError}</p>}

      {marlLoaded && marlState && (
        <div style={{ marginTop: 16 }}>
          <p className="hint-text">Device / agent status</p>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            {Array.from({ length: marlState.n_devices }).map((_, i) => {
              const isolated = marlState.isolated.includes(i)
              const compromised = i === marlState.compromised_idx && marlState.injection
              const color = isolated ? 'var(--danger)' : compromised ? 'var(--warning)' : 'var(--success)'
              return (
                <span key={i} style={{
                  width: 22, height: 22, borderRadius: 4, background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#0d1117', fontWeight: 700,
                }}>{i}</span>
              )
            })}
          </div>
          <p className="hint-text">Quarantined: {marlState.isolated.length} · Step: {marlState.step}</p>
          <button className="secondary" onClick={handleTick} style={{ marginTop: 8 }}>Tick network layer</button>
        </div>
      )}
    </div>
  )
}
