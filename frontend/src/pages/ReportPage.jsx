import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip
} from 'recharts'
import Navbar from '../components/Navbar'
import { getReport } from '../services/api'

function StatBox({ label, value, color = 'var(--yellow)' }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function ScoreGauge({ score }) {
  const color = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '5rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.04em' }}>{score}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>/ 100</div>
    </div>
  )
}

function ExpandableQA({ qa, index }) {
  const [open, setOpen] = useState(false)
  const score = Math.round((qa.correctness + qa.depth + qa.structure) / 3)
  const scoreColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--yellow)' : 'var(--red)'
  const diffColor = qa.difficulty === 'EASY' ? 'var(--green)' : qa.difficulty === 'HARD' ? 'var(--red)' : 'var(--yellow)'

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', cursor: 'pointer' }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 24 }}>Q{index + 1}</span>
        <div className="tag" style={{ flexShrink: 0 }}>{qa.category || 'TECHNICAL'}</div>
        <div className="tag" style={{ flexShrink: 0, borderColor: diffColor, color: diffColor }}>{qa.difficulty || 'MEDIUM'}</div>
        <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {qa.question}
        </span>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 900, color: scoreColor, minWidth: 36, textAlign: 'right' }}>{score}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', minWidth: 38, textAlign: 'right' }}>SCORE</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: 4 }}>{open ? '∧' : '∨'}</div>
      </div>

      {open && (
        <div style={{ padding: '0 0 20px 36px' }} className="fade-in">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 6 }}>YOUR ANSWER</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.65, color: 'var(--text-secondary)', background: 'var(--bg-card2)', padding: '12px 14px', borderLeft: '2px solid var(--border-bright)' }}>
              {qa.answer}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 6 }}>JUDGMENT</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.65, color: 'var(--text-secondary)', background: 'var(--bg-card2)', padding: '12px 14px', borderLeft: '2px solid var(--yellow)' }}>
              {qa.judgment}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[['CORRECT', qa.correctness], ['DEPTH', qa.depth], ['STRUCTURE', qa.structure]].map(([l, v]) => (
              <div key={l} style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 900, color: 'var(--yellow)' }}>{v}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const sessionId = state?.sessionId

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    const load = async () => {
      try {
        const res = await getReport(sessionId)
        setReport(res.data)
      } catch (e) {
        setError(e.response?.data?.detail || 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    // Poll until report ready (LLM generation can take a moment)
    const poll = async () => {
      for (let i = 0; i < 10; i++) {
        try {
          const res = await getReport(sessionId)
          setReport(res.data)
          setLoading(false)
          return
        } catch {
          await new Promise(r => setTimeout(r, 1500))
        }
      }
      setError('Report generation timed out. Please try again.')
      setLoading(false)
    }
    poll()
  }, [sessionId, navigate])

  if (loading) return (
    <div>
      <Navbar />
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>
          GENERATING REPORT...
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Gemini is analysing your performance
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div>
      <Navbar />
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div className="error-msg" style={{ fontSize: '0.9rem' }}>{error}</div>
        <button className="btn-secondary" onClick={() => navigate('/')}>← BACK HOME</button>
      </div>
    </div>
  )

  if (!report) return null

  const radarData = [
    { subject: 'Technical', value: report.technical },
    { subject: 'Communication', value: report.communication },
    { subject: 'Confidence', value: report.confidence },
    { subject: 'Engagement', value: report.engagement },
  ]

  const barData = (report.questions || []).map((qa, i) => ({
    name: `Q${i + 1}`,
    correctness: qa.correctness,
    depth: qa.depth,
    structure: qa.structure,
  }))

  const overallColor = report.overall_score >= 70 ? 'var(--green)' : report.overall_score >= 45 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <button className="btn-secondary" onClick={() => navigate('/')} style={{ fontSize: '0.7rem' }}>← BACK HOME</button>
          <button className="btn-secondary" onClick={() => navigate('/roles', { state: { resumeData: report.resume_context || { roles: [] } } })} style={{ fontSize: '0.7rem' }}>
            ↺ RETRY WITH ANOTHER ROLE
          </button>
        </div>

        {/* Verdict + Radar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
          {/* Left */}
          <div className="card">
            <div className="section-label">OVERALL VERDICT</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.05em' }}>{report.role?.toUpperCase()}</div>
            <ScoreGauge score={report.overall_score} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginTop: 20 }}>
              {report.verdict}
            </p>
          </div>

          {/* Radar */}
          <div className="card">
            <div className="section-label">MULTIMODAL BREAKDOWN</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={80}>
                <PolarGrid stroke="var(--border-bright)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Radar dataKey="value" stroke="var(--yellow)" fill="var(--yellow)" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
              {[['TECHNICAL', report.technical], ['COMMUNICATION', report.communication], ['CONFIDENCE', report.confidence], ['ENGAGEMENT', report.engagement]].map(([l, v]) => (
                <StatBox key={l} label={l} value={v} />
              ))}
            </div>
          </div>
        </div>

        {/* Strengths / Weaknesses / Coaching */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--border)', marginBottom: 32 }}>
          {/* Strengths */}
          <div className="card" style={{ border: 'none' }}>
            <div className="section-label">STRENGTHS</div>
            <ol style={{ paddingLeft: 20 }}>
              {report.strengths?.map((s, i) => (
                <li key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.65, color: 'var(--text-secondary)', marginBottom: 10 }}>{s}</li>
              ))}
            </ol>
          </div>
          {/* Weaknesses */}
          <div className="card" style={{ border: 'none' }}>
            <div className="section-label">WEAKNESSES</div>
            <ol style={{ paddingLeft: 20 }}>
              {report.weaknesses?.map((w, i) => (
                <li key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.65, color: 'var(--text-secondary)', marginBottom: 10 }}>{w}</li>
              ))}
            </ol>
          </div>
          {/* Coaching */}
          <div className="card" style={{ border: 'none' }}>
            <div className="section-label">COACHING TIPS</div>
            <ol style={{ paddingLeft: 20 }}>
              {report.coaching_tips?.map((t, i) => (
                <li key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.65, color: 'var(--text-secondary)', marginBottom: 10 }}>{t}</li>
              ))}
            </ol>
          </div>
        </div>

        {/* Per-question bar chart */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="section-label">PER-QUESTION SCORES</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}
                labelStyle={{ color: 'var(--text)' }}
                itemStyle={{ color: 'var(--text-secondary)' }}
              />
              <Bar dataKey="correctness" fill="var(--yellow)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="depth" fill="var(--blue)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="structure" fill="var(--green)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Behavioural + Study */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
          <div className="card">
            <div className="section-label">BEHAVIORAL INSIGHTS</div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.75, color: 'var(--text-secondary)' }}>
              {report.behavioral_insights}
            </p>
          </div>
          <div className="card">
            <div className="section-label">RECOMMENDED STUDY TOPICS</div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {report.study_topics?.map((t, i) => (
                <li key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '7px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--yellow)', flexShrink: 0 }}>→</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Transcript */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="section-label">TRANSCRIPT &amp; PER-QUESTION JUDGMENT</div>
          {(report.questions || []).map((qa, i) => (
            <ExpandableQA key={i} qa={qa} index={i} />
          ))}
        </div>

        {/* Job Openings */}
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div className="section-label" style={{ marginBottom: 16 }}>NEXT STEPS</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            Ready to apply your skills? Explore active job openings on LinkedIn that match your profile.
          </p>
          <a 
            href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(report.role)}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ display: 'inline-block', textDecoration: 'none', fontSize: '0.8rem', padding: '12px 24px' }}
          >
            SEARCH LINKEDIN FOR {report.role?.toUpperCase()} ROLES ↗
          </a>
        </div>
      </div>
    </div>
  )
}
