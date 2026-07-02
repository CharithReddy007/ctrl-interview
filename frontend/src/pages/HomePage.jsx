import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { parsePDF, parseText } from '../services/api'

const FEATURES = [
  { icon: '⚙', label: 'ADAPTIVE AGENT' },
  { icon: '◈', label: 'AUDIO INTEL' },
  { icon: '◉', label: 'VISION HEURISTICS' },
  { icon: '✦', label: 'GEMINI 1.5 FLASH' },
]

const HOW_IT_WORKS = [
  { icon: '▤', title: 'Context Module', desc: 'Parses resume, extracts skills/projects/seniority, infers 3–5 realistic target roles with match scores.' },
  { icon: '⬡', title: 'Orchestrator Agent', desc: 'Generates each question on the fly. Adapts difficulty when you struggle. Digs deeper when you don\'t.' },
  { icon: '◈', title: 'Audio Intelligence', desc: 'Web Audio + transcript analysis: speech rate, pauses, hesitation tokens → confidence & clarity.' },
  { icon: '◉', title: 'Visual Heuristics', desc: 'Frame-diff & skin-tone heuristics for face presence, motion, eye-contact — no models, in-browser.' },
  { icon: '⬢', title: 'Technical Evaluator', desc: 'LLM scores correctness, depth, structure per answer. Justifications you can actually read.' },
  { icon: '✦', title: 'Coaching Agent', desc: 'Bento scorecard, strengths, weaknesses, specific tips, behavioural insights, study topics.' },
]

export default function HomePage() {
  const [tab, setTab] = useState('upload')
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const navigate = useNavigate()

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.match(/\.(pdf|txt)$/i)) { setError('Only PDF or TXT files accepted'); return }
    setFile(f); setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleAnalyse = async () => {
    setLoading(true); setError('')
    try {
      let res
      if (tab === 'upload') {
        if (!file) { setError('Please upload a resume file'); setLoading(false); return }
        res = await parsePDF(file)
      } else {
        if (pasteText.trim().length < 50) { setError('Please paste your resume text (min 50 chars)'); setLoading(false); return }
        res = await parseText(pasteText)
      }
      navigate('/roles', { state: { resumeData: res.data } })
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to analyse resume. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      {/* Hero */}
      <section style={{minHeight:'calc(100vh - 56px)',display:'flex',alignItems:'center',padding:'60px 40px',gap:'60px',maxWidth:'1400px',margin:'0 auto'}}>
        {/* Left */}
        <div style={{flex:'1',minWidth:0}} className="fade-in">
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'28px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--red)',animation:'pulse 2s infinite'}}/>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',letterSpacing:'0.2em',color:'var(--text-secondary)'}}>SYSTEM ONLINE / AGENT READY</span>
          </div>

          <h1 style={{fontSize:'clamp(2.5rem,6vw,5rem)',fontWeight:900,lineHeight:1.0,letterSpacing:'-0.02em',marginBottom:'28px'}}>
            YOUR RESUME<br/>MEETS A <span style={{color:'var(--yellow)'}}>BRUTAL</span><br/>HONEST<br/>INTERVIEWER.
          </h1>

          <p style={{fontFamily:'var(--font-mono)',fontSize:'0.85rem',lineHeight:1.7,color:'var(--text-secondary)',maxWidth:'560px',marginBottom:'36px'}}>
            Upload your resume. We infer the roles you can realistically land, run a multimodal mock interview that adapts in real-time to your answers, and hand back a transparent scorecard — technical, communication, confidence, engagement.
          </p>

          <div style={{display:'flex',flexWrap:'wrap',gap:'10px'}}>
            {FEATURES.map(f => (
              <div key={f.label} className="tag" style={{padding:'6px 12px'}}>
                <span>{f.icon}</span> {f.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right - Upload card */}
        <div style={{width:'480px',flexShrink:0}} className="fade-in-delay-1">
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {/* Tabs */}
            <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
              {['upload','paste'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex:1,padding:'14px 20px',background: tab===t ? 'var(--bg-card2)' : 'transparent',
                  border:'none',fontFamily:'var(--font-mono)',fontSize:'0.75rem',letterSpacing:'0.12em',
                  textTransform:'uppercase',cursor:'pointer',color: tab===t ? 'var(--text)' : 'var(--text-secondary)',
                  borderBottom: tab===t ? '2px solid var(--yellow)' : '2px solid transparent',transition:'all 0.15s'
                }}>
                  {t === 'upload' ? 'UPLOAD PDF' : 'PASTE TEXT'}
                </button>
              ))}
            </div>

            <div style={{padding:'24px'}}>
              {tab === 'upload' ? (
                <div
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border:`2px dashed ${dragging ? 'var(--yellow)' : file ? 'var(--green)' : 'var(--border-bright)'}`,
                    padding:'48px 24px',textAlign:'center',cursor:'pointer',
                    background: dragging ? 'rgba(255,214,0,0.03)' : 'transparent',
                    transition:'all 0.15s'
                  }}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.txt" style={{display:'none'}} onChange={e => handleFile(e.target.files[0])} />
                  <div style={{fontSize:'1.5rem',marginBottom:'12px'}}>↑</div>
                  <div style={{fontFamily:'var(--font-mono)',fontWeight:700,fontSize:'0.8rem',letterSpacing:'0.1em',marginBottom:'6px',color: file ? 'var(--green)' : 'var(--text)'}}>
                    {file ? file.name : 'DROP RESUME PDF HERE'}
                  </div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--text-muted)'}}>
                    {file ? `${(file.size/1024).toFixed(1)} KB · click to change` : 'or click to browse · PDF / TXT'}
                  </div>
                </div>
              ) : (
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste your resume text here..."
                  style={{height:'180px',resize:'vertical',fontFamily:'var(--font-mono)',fontSize:'0.8rem',lineHeight:1.6}}
                />
              )}

              {error && <div className="error-msg" style={{marginTop:'12px'}}>{error}</div>}

              <button
                className="btn-primary"
                onClick={handleAnalyse}
                disabled={loading}
                style={{width:'100%',justifyContent:'center',marginTop:'20px',padding:'16px'}}
              >
                {loading ? <span className="spinner"/> : null}
                {loading ? 'ANALYSING RESUME...' : '→ ANALYSE & INFER ROLES'}
              </button>

              <p style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--text-muted)',textAlign:'center',marginTop:'14px',lineHeight:1.6}}>
                Your data stays in this session. Transcript & metrics are stored only to render your report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{padding:'80px 40px',maxWidth:'1400px',margin:'0 auto',borderTop:'1px solid var(--border)'}}>
        <div className="section-label" style={{marginBottom:'8px'}}>HOW IT WORKS</div>
        <h2 style={{fontSize:'clamp(1.5rem,3vw,2.2rem)',fontWeight:800,marginBottom:'48px'}}>Six agents. One transparent verdict.</h2>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1px',background:'var(--border)'}}>
          {HOW_IT_WORKS.map((item, i) => (
            <div key={i} className="card" style={{background:'var(--bg-card)',border:'none',padding:'32px'}}>
              <div style={{fontSize:'1.4rem',color:'var(--yellow)',marginBottom:'16px',fontFamily:'var(--font-mono)'}}>{item.icon}</div>
              <h3 style={{fontWeight:700,fontSize:'1rem',marginBottom:'12px'}}>{item.title}</h3>
              <p style={{fontFamily:'var(--font-mono)',fontSize:'0.75rem',lineHeight:1.7,color:'var(--text-secondary)'}}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{borderTop:'1px solid var(--border)',padding:'20px 40px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--text-muted)',letterSpacing:'0.1em'}}>
          CTRL+INTERVIEW · v0.1 · BUILT WITH FASTAPI + REACT + GEMINI
        </span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--text-muted)',letterSpacing:'0.1em'}}>
          NO RECORDING IS UPLOADED TO ANY SERVER
        </span>
      </footer>
    </div>
  )
}
