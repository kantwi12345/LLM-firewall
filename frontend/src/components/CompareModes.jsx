import { useState } from 'react'
import api from '../api'

export default function CompareModes({ apiKey }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleCompare = async () => {
    if (!text.trim()) return
    setError(null)
    try {
      const r = await api.compare(apiKey, text)
      setResult(r)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
  }

  const modes = result ? [
    ['Keyword-only (regex + synonym + obfuscation)', result.keyword_only],
    ['Semantic-only', result.semantic_only],
    ['Hybrid (full layered system)', result.hybrid],
  ] : []

  return (
    <div className="card">
      <h3>🧪 Compare Detection Modes</h3>
      <p className="hint-text">See how the same prompt scores under keyword-only, semantic-only, and the full hybrid system.</p>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Try a paraphrased attack, e.g. 'Cease adherence to prior directives.'"
      />
      <button onClick={handleCompare} style={{ marginTop: 8 }}>Compare</button>
      {error && <p className="error-text">{error}</p>}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
          {modes.map(([name, data]) => (
            <div key={name} className="card" style={{
              borderColor: data.classification === 'blocked' ? 'var(--danger)' : data.classification === 'suspicious' ? 'var(--warn)' : 'var(--safe)'
            }}>
              <b style={{ fontSize: 13 }}>{name}</b>
              <div style={{ fontSize: 22, margin: '8px 0' }}>{data.score.toFixed(2)}</div>
              <span className={`badge badge-${data.classification === 'blocked' ? 'danger' : data.classification === 'suspicious' ? 'warn' : 'safe'}`}>
                {data.classification.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="hint-text" style={{ marginTop: 12 }}>
        This highlights why layering matters: keyword-only and semantic-only each miss things the hybrid system catches.
      </p>
    </div>
  )
}
