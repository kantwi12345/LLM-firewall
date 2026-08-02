import { useState, useEffect } from 'react'
import './theme.css'
import api from './api'
import Sidebar from './components/Sidebar'
import LiveFirewall from './components/LiveFirewall'
import DemoChallenge from './components/DemoChallenge'
import DocumentVoice from './components/DocumentVoice'
import Analytics from './components/Analytics'
import CompareModes from './components/CompareModes'
import ThreatIntel from './components/ThreatIntel'
import ParticleField from './components/ParticleField'
import AnimatedNumber from './components/AnimatedNumber'

const TABS = [
  ['live', '🛡️ Live Firewall'],
  ['demo', '🎯 Demo & Challenge'],
  ['media', '📄🎙️ Document & Voice'],
  ['analytics', '📊 Analytics & Logs'],
  ['compare', '🧪 Compare Modes'],
  ['intel', '📖 Threat Intel'],
]

export default function App() {
  const [tab, setTab] = useState('live')
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_soc_api_key') || '')
  const [health, setHealth] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [quickStats, setQuickStats] = useState({ total: 0, safe: 0, suspicious: 0, blocked: 0 })

  useEffect(() => {
    localStorage.setItem('ai_soc_api_key', apiKey)
  }, [apiKey])

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ status: 'error' }))
  }, [])

  useEffect(() => {
    if (!apiKey) return
    api.getStats(apiKey).then(setQuickStats).catch(() => {})
  }, [apiKey, refreshKey])

  const bumpRefresh = () => setRefreshKey(k => k + 1)

  return (
    <div>
      <ParticleField count={20} />
      <Sidebar apiKey={apiKey} setApiKey={setApiKey} backendUrl={import.meta.env.VITE_API_URL || 'http://localhost:8000'} health={health} />
      <div className="main-content">
        <div className="app">
          <h1><span className="shield-icon">🛡️</span> AI-SOC — Prompt Injection Firewall</h1>
          <p className="subtitle">
            <span className={`status-dot ${health?.status === 'ok' ? 'connected' : 'error'}`}></span>
            A layered defense system monitoring, analyzing, and blocking malicious prompts in real time.
          </p>

          {apiKey && (
            <div className="stat-row">
              <div className="stat-card"><div className="value"><AnimatedNumber value={quickStats.total} /></div><div className="label">Analyzed</div></div>
              <div className="stat-card"><div className="value" style={{ color: 'var(--safe)' }}><AnimatedNumber value={quickStats.safe} /></div><div className="label">Safe</div></div>
              <div className="stat-card"><div className="value" style={{ color: 'var(--warn)' }}><AnimatedNumber value={quickStats.suspicious} /></div><div className="label">Suspicious</div></div>
              <div className="stat-card"><div className="value" style={{ color: 'var(--danger)' }}><AnimatedNumber value={quickStats.blocked} /></div><div className="label">Blocked</div></div>
              <div className="stat-card"><div className="value">{health?.text_model_loaded ? '🟢' : '🟡'}</div><div className="label">System Health</div></div>
            </div>
          )}

          {!apiKey && (
            <div className="card" style={{ borderColor: 'var(--warn)' }}>
              <p className="error-text" style={{ color: 'var(--warn)' }}>
                Enter your API key in the sidebar to use the dashboard.
              </p>
            </div>
          )}

          <div className="tabs">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                className={`tab ${tab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {apiKey && (
            <div className="tab-content" key={tab}>
              {tab === 'live' && <LiveFirewall apiKey={apiKey} onAnalyzed={bumpRefresh} />}
              {tab === 'demo' && <DemoChallenge apiKey={apiKey} onAnalyzed={bumpRefresh} />}
              {tab === 'media' && <DocumentVoice apiKey={apiKey} onAnalyzed={bumpRefresh} />}
              {tab === 'analytics' && <Analytics apiKey={apiKey} refreshKey={refreshKey} />}
              {tab === 'compare' && <CompareModes apiKey={apiKey} />}
              {tab === 'intel' && <ThreatIntel apiKey={apiKey} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
