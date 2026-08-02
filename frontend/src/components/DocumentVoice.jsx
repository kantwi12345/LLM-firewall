import { useState, useRef } from 'react'
import api from '../api'

export default function DocumentVoice({ apiKey, onAnalyzed }) {
  const [docResult, setDocResult] = useState(null)
  const [docError, setDocError] = useState(null)
  const [docLoading, setDocLoading] = useState(false)

  const [recording, setRecording] = useState(false)
  const [voiceResult, setVoiceResult] = useState(null)
  const [voiceError, setVoiceError] = useState(null)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const handleDocUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setDocLoading(true)
    setDocError(null)
    setDocResult(null)
    try {
      const r = await api.analyzeDocument(apiKey, file)
      setDocResult(r)
      onAnalyzed?.()
    } catch (err) {
      setDocError(err.response?.data?.detail || err.message)
    } finally {
      setDocLoading(false)
    }
  }

  const startRecording = async () => {
    setVoiceError(null)
    setVoiceResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        setVoiceLoading(true)
        try {
          const r = await api.analyzeVoice(apiKey, blob)
          setVoiceResult(r)
          onAnalyzed?.()
        } catch (err) {
          setVoiceError(err.response?.data?.detail || err.message)
        } finally {
          setVoiceLoading(false)
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch (err) {
      setVoiceError('Microphone access denied or unavailable: ' + err.message)
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="two-col">
      <div className="card">
        <h3>📄 Document Analysis</h3>
        <p className="hint-text">
          Upload a .txt or .pdf file. Its full text is extracted and analyzed —
          a direct test of Indirect Injection.
        </p>
        <input type="file" accept=".txt,.pdf" onChange={handleDocUpload} disabled={docLoading} />
        {docLoading && <p className="hint-text">Analyzing...</p>}
        {docError && <p className="error-text">{docError}</p>}
        {docResult && (
          <p style={{ marginTop: 12 }}>
            <span className={`badge badge-${docResult.classification === 'blocked' ? 'danger' : docResult.classification === 'suspicious' ? 'warn' : 'safe'}`}>
              {docResult.classification.toUpperCase()}
            </span>{' '}
            threat score {docResult.threat_score.toFixed(2)}, category: {docResult.matched_category || 'none'}
          </p>
        )}
      </div>

      <div className="card">
        <h3>🎙️ Voice Input</h3>
        <p className="hint-text">
          Record using your browser's microphone. Transcribed via Whisper on the backend,
          then analyzed the same way as typed input.
        </p>
        {!recording ? (
          <button onClick={startRecording} disabled={voiceLoading}>🎙️ Start Recording</button>
        ) : (
          <button onClick={stopRecording} style={{ background: 'var(--danger)' }}>⏹ Stop Recording</button>
        )}
        {voiceLoading && <p className="hint-text">Transcribing...</p>}
        {voiceError && <p className="error-text">{voiceError}</p>}
        {voiceResult && (
          <div style={{ marginTop: 12 }}>
            <p><b>Transcribed:</b> {voiceResult.transcript}</p>
            <p>
              <span className={`badge badge-${voiceResult.analysis.classification === 'blocked' ? 'danger' : voiceResult.analysis.classification === 'suspicious' ? 'warn' : 'safe'}`}>
                {voiceResult.analysis.classification.toUpperCase()}
              </span>{' '}
              threat score {voiceResult.analysis.threat_score.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
