import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getSessions } from '../services/api'

function SessionRow({ s, i, isLast, fmt, navigate }) {
  const [open, setOpen] = useState(false)
  const [viewResume, setViewResume] = useState(false)

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <div
        style={{
          display: 'grid', gridTemplateColumns: '220px 1fr 140px 100px 140px',
          gap: 16, padding: '18px 24px', alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fmt(s.created_at)}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>{s.role}</div>
        <div>
          <div className={`tag ${s.status === 'completed' ? 'green' : ''}`} style={{ fontSize: '0.65rem' }}>
            {s.status?.toUpperCase()}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 900, color: 'var(--yellow)' }}>
          {s.score ?? '—'}
        </div>
        <div>
          {s.status === 'completed' ? (
            <button
              className="btn-secondary"
              onClick={(e) => { e.stopPropagation(); navigate('/report', { state: { sessionId: s.session_id } }) }}
              style={{ fontSize: '0.65rem', padding: '6px 14px' }}
            >
              VIEW REPORT →
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={(e) => { 
                e.stopPropagation(); 
                navigate('/interview', { 
                  state: { 
                    sessionId: s.session_id,
                    question: s.current_question,
                    questionNumber: s.current_question_number,
                    totalQuestions: s.total_questions,
                    role: s.full_role,
                    resumeData: s.resume_context
                  } 
                }) 
              }}
              style={{ fontSize: '0.65rem', padding: '6px 14px' }}
            >
              CONTINUE →
            </button>
          )}
        </div>
      </div>

      {open && s.resume_context && (
        <div style={{ padding: '0 24px 24px 24px', background: 'var(--bg-card2)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: viewResume ? 16 : 0 }}>
             <button className="btn-secondary" onClick={() => setViewResume(!viewResume)} style={{ fontSize: '0.7rem' }}>
               {viewResume ? 'HIDE RESUME' : 'VIEW PAST RESUME'}
             </button>
             <button className="btn-secondary" onClick={() => navigate('/roles', { state: { resumeData: s.resume_context } })} style={{ fontSize: '0.7rem' }}>
               VIEW SUGGESTED ROLES →
             </button>
          </div>
          {viewResume && (
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: 16, 
              border: '1px solid var(--border)', 
              maxHeight: 300, 
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.7rem', 
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap'
            }}>
              {s.resume_context.raw_resume || "No raw resume text available."}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getSessions()
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (d) => d ? new Date(d).toLocaleString() : '—'

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>↺</span>
          <div className="section-label" style={{ marginBottom: 0 }}>SESSION ARCHIVE</div>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 36 }}>PAST INTERVIEWS</h1>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>NO INTERVIEWS YET</div>
            <button className="btn-primary" onClick={() => navigate('/')}>→ START YOUR FIRST INTERVIEW</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 140px 100px 140px', gap: 16, padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
              {['DATE', 'ROLE', 'STATUS', 'SCORE', 'ACTION'].map(h => (
                <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>{h}</div>
              ))}
            </div>
            {sessions.map((s, i) => (
              <SessionRow 
                key={s.session_id} 
                s={s} 
                i={i} 
                isLast={i === sessions.length - 1} 
                fmt={fmt} 
                navigate={navigate} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
