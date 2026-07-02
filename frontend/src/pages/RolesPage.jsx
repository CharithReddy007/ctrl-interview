import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Navbar from '../components/Navbar'
import { startInterview } from '../services/api'

const DOMAIN_COLORS = {
  Backend: 'var(--yellow)', Frontend: 'var(--blue)',
  DevOps: 'var(--green)', Infrastructure: '#FF6B35',
  'Distributed Systems': '#B06EFF', SRE: 'var(--red)',
}

export default function RolesPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [starting, setStarting] = useState(null)
  const [error, setError] = useState('')

  const resumeData = state?.resumeData
  if (!resumeData) { navigate('/'); return null }

  const handleStart = async (role) => {
    setStarting(role.id); setError('')
    try {
      const res = await startInterview(resumeData, role)
      navigate('/interview', {
        state: {
          sessionId: res.data.session_id,
          question: res.data.question,
          questionNumber: res.data.question_number,
          totalQuestions: res.data.total_questions,
          role,
          resumeData,
        }
      })
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to start interview')
      setStarting(null)
    }
  }

  const { candidate_name, seniority, domain, detected_skills, roles } = resumeData

  return (
    <div>
      <Navbar />
      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'48px 40px'}}>
        {/* Back */}
        <button onClick={() => navigate('/')} className="btn-secondary" style={{marginBottom:'32px',fontSize:'0.7rem'}}>
          ← BACK
        </button>

        {/* Candidate card */}
        <div className="section-label">CONTEXT EXTRACTED</div>
        <h1 style={{fontSize:'clamp(2rem,4vw,3rem)',fontWeight:900,letterSpacing:'-0.02em',marginBottom:'20px'}}>
          {candidate_name?.toUpperCase() || 'CANDIDATE'}
        </h1>

        <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'28px'}}>
          <div className="tag yellow">SENIORITY: {seniority?.toUpperCase()}</div>
          {(Array.isArray(domain) ? domain : [domain]).map(d => (
            <div key={d} className="tag" style={{borderColor:DOMAIN_COLORS[d]||'var(--border-bright)',color:DOMAIN_COLORS[d]||'var(--text-secondary)'}}>{d}</div>
          ))}
        </div>

        <div className="card" style={{marginBottom:'40px',padding:'20px 24px'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',letterSpacing:'0.15em',color:'var(--text-secondary)',marginBottom:'12px'}}>DETECTED SKILLS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
            {detected_skills?.map(s => (
              <div key={s} className="tag" style={{padding:'4px 10px'}}>{s}</div>
            ))}
          </div>
        </div>

        {/* Roles */}
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'24px'}}>
          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--yellow)',animation:'pulse 2s infinite'}}/>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',letterSpacing:'0.2em',color:'var(--text-secondary)'}}>
            // INFERRED ROLES — PICK ONE TO INTERVIEW FOR
          </span>
        </div>

        {error && <div className="error-msg" style={{marginBottom:'16px'}}>{error}</div>}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px'}}>
          {roles?.map((role, i) => (
            <div key={role.id} className="card fade-in" style={{
              animationDelay:`${i*0.07}s`,
              borderColor: i === 0 ? 'var(--yellow)' : 'var(--border)',
              position:'relative',overflow:'hidden'
            }}>
              {i === 0 && (
                <div style={{position:'absolute',top:0,right:0,background:'var(--yellow)',padding:'4px 10px',fontFamily:'var(--font-mono)',fontSize:'0.6rem',fontWeight:700,color:'#000',letterSpacing:'0.1em'}}>
                  TOP MATCH
                </div>
              )}

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--text-muted)',letterSpacing:'0.1em'}}>
                  ROLE {String(i+1).padStart(2,'0')}
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'1.8rem',fontWeight:900,color:'var(--yellow)',lineHeight:1}}>
                  {role.match_score}
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'16px'}}>
                <h3 style={{fontSize:'1.15rem',fontWeight:800}}>{role.title}</h3>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--text-muted)',letterSpacing:'0.1em'}}>MATCH</div>
              </div>

              {/* Score bar */}
              <div className="progress-bar" style={{marginBottom:'16px'}}>
                <div className="progress-bar-fill" style={{width:`${role.match_score}%`}}/>
              </div>

              <p style={{fontFamily:'var(--font-mono)',fontSize:'0.73rem',lineHeight:1.65,color:'var(--text-secondary)',marginBottom:'16px'}}>
                {role.reasoning}
              </p>

              <div style={{marginBottom:'20px'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',letterSpacing:'0.15em',color:'var(--text-muted)',marginBottom:'10px'}}>FOCUS AREAS</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                  {role.focus_areas?.map(fa => (
                    <div key={fa} className="tag" style={{fontSize:'0.6rem',padding:'3px 8px'}}>{fa}</div>
                  ))}
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => handleStart(role)}
                disabled={!!starting}
                style={{fontSize:'0.75rem',padding:'10px 20px'}}
              >
                {starting === role.id ? <><span className="spinner"/> STARTING...</> : '> START INTERVIEW'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
