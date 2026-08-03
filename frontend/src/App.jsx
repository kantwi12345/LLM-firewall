import { useState, useEffect } from 'react'
import './theme.css'
import api from './api'
import LiveFirewall from './components/LiveFirewall'
import DemoChallenge from './components/DemoChallenge'
import DocumentVoice from './components/DocumentVoice'
import Analytics from './components/Analytics'
import CompareModes from './components/CompareModes'
import ThreatIntel from './components/ThreatIntel'
import NetworkLayer from './components/NetworkLayer'

const NAV_ITEMS = [
  ['live', 'Live Firewall', '◆'],
  ['demo', 'Demo & Challenge', '▶'],
  ['media', 'Document & Voice', '▤'],
  ['analytics', 'Analytics & Logs', '▦'],
  ['compare', 'Compare Modes', '▥'],
  ['network', 'Network Layer', '◈'],
  ['intel', 'Threat Intel', '▧'],
]

const PAGE_TITLES = Object.fromEntries(NAV_ITEMS.map(([k, l]) => [k, l]))

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
    <div className="app-shell">
      <nav className="nav-rail">
        <div className="nav-brand">
          <div className="logo-mark">AI</div>
          <div>
            <div className="brand-text">AI-SOC</div>
            <div className="brand-sub">Prompt Injection Firewall</div>
          </div>
        </div>

        <div className="nav-section-label">Monitor</div>
        {NAV_ITEMS.map(([key, label, icon]) => (
          <div
            key={key}
            className={`nav-item ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </div>
        ))}

        <div className="nav-footer">
          <label className="hint-text">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key"
            style={{ marginTop: 4 }}
          />
        </div>
      </nav>

      <div className="main-area">
        <div className="top-bar">
          <h1>{PAGE_TITLES[tab]}</h1>
          <span className="status-pill">
            <span className={`status-dot ${health?.status === 'ok' ? 'connected' : 'error'}`}></span>
            {health?.status === 'ok' ? 'Connected' : health ? 'Connection error' : 'Checking...'}
          </span>
        </div>

        <div className="content">
          {!apiKey ? (
            <div className="card" style={{ borderLeft: '3px solid var(--warning)' }}>
              <p className="hint-text">Enter your API key in the left panel to use the console.</p>
            </div>
          ) : (
            <>
              <div className="metric-row">
                <div className="metric-card"><div className="metric-value">{quickStats.total}</div><div className="metric-label">Analyzed</div></div>
                <div className="metric-card"><div className="metric-value" style={{ color: 'var(--success)' }}>{quickStats.safe}</div><div className="metric-label">Safe</div></div>
                <div className="metric-card"><div className="metric-value" style={{ color: 'var(--warning)' }}>{quickStats.suspicious}</div><div className="metric-label">Suspicious</div></div>
                <div className="metric-card"><div className="metric-value" style={{ color: 'var(--danger)' }}>{quickStats.blocked}</div><div className="metric-label">Blocked</div></div>
                <div className="metric-card"><div className="metric-value">{health?.text_model_loaded ? 'Online' : 'Degraded'}</div><div className="metric-label">System Health</div></div>
              </div>

              <div className="tab-content" key={tab}>
                {tab === 'live' && <LiveFirewall apiKey={apiKey} onAnalyzed={bumpRefresh} />}
                {tab === 'demo' && <DemoChallenge apiKey={apiKey} onAnalyzed={bumpRefresh} />}
                {tab === 'media' && <DocumentVoice apiKey={apiKey} onAnalyzed={bumpRefresh} />}
                {tab === 'analytics' && <Analytics apiKey={apiKey} refreshKey={refreshKey} />}
                {tab === 'compare' && <CompareModes apiKey={apiKey} />}
                {tab === 'network' && <NetworkLayer apiKey={apiKey} />}
                {tab === 'intel' && <ThreatIntel apiKey={apiKey} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
