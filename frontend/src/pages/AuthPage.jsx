import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../services/api'
import useAuthStore from '../store/authStore'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) { setError('All fields required'); return }
    setLoading(true); setError('')
    try {
      const fn = mode === 'login' ? login : register
      const res = await fn({ username, password })
      setAuth(res.data.access_token, { username: res.data.username })
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 20px'}}>
      <div style={{width:'100%',maxWidth:'400px'}} className="fade-in">
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'48px'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
            <div style={{width:'44px',height:'44px',background:'var(--yellow)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" fill="#000"/>
                <rect x="11" y="2" width="7" height="7" fill="#000"/>
                <rect x="2" y="11" width="7" height="7" fill="#000"/>
                <rect x="11" y="11" width="7" height="7" fill="#000" opacity="0.4"/>
              </svg>
            </div>
            <div>
              <div style={{fontFamily:'var(--font-mono)',fontWeight:700,fontSize:'1rem',letterSpacing:'0.05em'}}>CTRL+INTERVIEW</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',letterSpacing:'0.15em',color:'var(--text-secondary)'}}>AGENTIC MOCK INTERVIEWER</div>
            </div>
          </div>
        </div>

        <div className="card" style={{padding:'32px'}}>
          {/* Tab toggle */}
          <div style={{display:'flex',marginBottom:'28px',borderBottom:'1px solid var(--border)'}}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex:1, padding:'10px', background:'none', border:'none',
                fontFamily:'var(--font-mono)', fontSize:'0.75rem', letterSpacing:'0.1em',
                textTransform:'uppercase', cursor:'pointer',
                color: mode===m ? 'var(--yellow)' : 'var(--text-secondary)',
                borderBottom: mode===m ? '2px solid var(--yellow)' : '2px solid transparent',
                marginBottom:'-1px', transition:'all 0.15s'
              }}>
                {m === 'login' ? 'SIGN IN' : 'REGISTER'}
              </button>
            ))}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',letterSpacing:'0.15em',color:'var(--text-secondary)',marginBottom:'6px'}}>USERNAME</div>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="your_username"
                autoComplete="username"
              />
            </div>
            <div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',letterSpacing:'0.15em',color:'var(--text-secondary)',marginBottom:'6px'}}>PASSWORD</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{width:'100%',justifyContent:'center',marginTop:'8px'}}>
              {loading ? <span className="spinner"/> : null}
              {loading ? 'PROCESSING...' : mode === 'login' ? '→ SIGN IN' : '→ CREATE ACCOUNT'}
            </button>
          </div>
        </div>

        <div style={{textAlign:'center',marginTop:'24px',fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--text-muted)',letterSpacing:'0.1em'}}>
          YOUR RESUME. BRUTAL HONESTY. ONE VERDICT.
        </div>
      </div>
    </div>
  )
}
