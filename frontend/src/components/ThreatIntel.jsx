import { useState, useEffect } from 'react'
import api from '../api'

const INTEL = {
  'Prompt Injection': 'Crafting input that manipulates an AI system into ignoring its original instructions or following attacker-supplied ones instead.',
  'Jailbreaking': "Attempting to remove or bypass an AI system's safety behavior, often by claiming an alternate 'mode' with no restrictions.",
  'Indirect Injection': 'Hiding malicious instructions inside content the AI processes indirectly (a document, webpage, or tool output) rather than the direct user message.',
  'Tool Manipulation': 'Tricking an AI agent into misusing the external tools or functions it has access to.',
  'Context Poisoning': "Gradually introducing misleading information into an AI's working context so its later outputs are subtly corrupted.",
  'Role Confusion': 'Making the AI believe it should act as a different entity or persona than intended, weakening its normal safeguards.',
  'Instruction Override': 'Directly asking the system to ignore, forget, or disregard its original instructions.',
  'Data Leakage': "Extracting private or sensitive information the system has access to but shouldn't disclose.",
  'System Prompt Extraction': "Attempting to get the AI to reveal its own configuration or hidden instructions.",
}

export default function ThreatIntel({ apiKey }) {
  const [categories, setCategories] = useState(null)

  useEffect(() => {
    api.getThreatIntel(apiKey).then(d => setCategories(d.categories)).catch(() => {})
  }, [apiKey])

  return (
    <div className="card">
      <h3>Threat Intelligence Knowledge Base</h3>
      {Object.entries(INTEL).map(([term, desc]) => (
        <p key={term}><b>{term}</b> — {desc}</p>
      ))}

      <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />
      <h3>Recognized Threat Categories in This System</h3>
      {categories && Object.entries(categories).map(([cat, spec]) => (
        <div key={cat} className="layer-row">
          <span className="name">{cat} (severity weight: {spec.weight})</span>
          <span className="hint-text">{spec.pattern_count} patterns</span>
        </div>
      ))}
    </div>
  )
}
