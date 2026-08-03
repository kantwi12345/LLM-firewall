import { useState, useEffect } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api'

const COLORS = ['#3fb950', '#d29922', '#f85149', '#2f81f7', '#8957e5', '#db61a2']

export default function Analytics({ apiKey, refreshKey }) {
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const [s, l] = await Promise.all([api.getStats(apiKey), api.getLogs(apiKey)])
        setStats(s)
        setLogs(l)
        setError(null)
      } catch (err) {
        setError(err.response?.data?.detail || err.message)
      }
    })()
  }, [apiKey, refreshKey])

  const handleReset = async () => {
    await api.resetLogs(apiKey)
    setStats(await api.getStats(apiKey))
    setLogs([])
  }

  const handleExportCsv = () => {
    const header = 'timestamp,source,prompt,category,threat_score,confidence,decision,latency_ms\n'
    const rows = logs.map(l =>
      [new Date(l.timestamp * 1000).toISOString(), l.source, `"${(l.prompt || '').replace(/"/g, '""')}"`,
       l.category || '', l.threat_score, l.confidence, l.decision, l.latency_ms].join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ai_soc_logs.csv'
    a.click()
  }

  if (error) return <p className="error-text">{error}</p>
  if (!stats) return <p className="hint-text">Loading...</p>

  const decisionData = [
    { name: 'Safe', value: stats.safe },
    { name: 'Suspicious', value: stats.suspicious },
    { name: 'Blocked', value: stats.blocked },
  ]
  const categoryData = Object.entries(stats.by_category || {}).map(([name, value]) => ({ name, value }))
  const trendData = [...logs].reverse().map((l, i) => ({ i, threat_score: l.threat_score }))

  return (
    <div>
      <div className="stat-row">
        <div className="stat-card"><div className="value">{(stats.avg_confidence * 100).toFixed(0)}%</div><div className="label">Avg. Confidence</div></div>
        <div className="stat-card"><div className="value">{stats.avg_latency_ms.toFixed(1)} ms</div><div className="label">Avg. Latency</div></div>
        <div className="stat-card"><div className="value">{stats.total}</div><div className="label">Total Analyzed</div></div>
        <div className="stat-card"><div className="value">{stats.total ? (((stats.suspicious + stats.blocked) / stats.total) * 100).toFixed(0) : 0}%</div><div className="label">Detection Rate</div></div>
        <div className="stat-card"><div className="value">{stats.blocked}</div><div className="label">Blocked</div></div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Decisions</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={decisionData}>
              <XAxis dataKey="name" stroke="#8b949e" />
              <YAxis stroke="#8b949e" />
              <Tooltip contentStyle={{ background: '#151b26', border: '1px solid #24303f', fontSize: 12 }} />
              <Bar dataKey="value">
                {decisionData.map((entry, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Threat Category Distribution</h3>
          {categoryData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {categoryData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#151b26', border: '1px solid #24303f', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="hint-text">No categorized threats yet.</p>}
        </div>
      </div>

      <div className="card">
        <h3>Threat Score Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <XAxis dataKey="i" stroke="#8b949e" />
            <YAxis stroke="#8b949e" domain={[0, 1]} />
            <Tooltip contentStyle={{ background: '#151b26', border: '1px solid #24303f', fontSize: 12 }} />
            <Line type="monotone" dataKey="threat_score" stroke="#2f81f7" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>Security Logs</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button className="secondary" onClick={handleExportCsv}>⬇ Export CSV</button>
          <button className="secondary" onClick={handleReset}>🔄 Reset Logs</button>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr><th>Time</th><th>Source</th><th>Prompt</th><th>Category</th><th>Score</th><th>Decision</th></tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td>{new Date(l.timestamp * 1000).toLocaleTimeString()}</td>
                  <td>{l.source}</td>
                  <td>{(l.prompt || '').slice(0, 40)}</td>
                  <td>{l.category || '-'}</td>
                  <td>{l.threat_score.toFixed(2)}</td>
                  <td><span className={`badge badge-${l.decision === 'blocked' ? 'danger' : l.decision === 'suspicious' ? 'warn' : 'safe'}`}>{l.decision}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
