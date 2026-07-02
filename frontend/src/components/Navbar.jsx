import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <div className="navbar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="7" height="7" fill="#000"/>
            <rect x="11" y="2" width="7" height="7" fill="#000"/>
            <rect x="2" y="11" width="7" height="7" fill="#000"/>
            <rect x="11" y="11" width="7" height="7" fill="#000" opacity="0.4"/>
          </svg>
        </div>
        <div className="navbar-logo-text">
          <span className="navbar-logo-title">CTRL+INTERVIEW</span>
          <span className="navbar-logo-sub">AGENTIC MOCK INTERVIEWER</span>
        </div>
      </Link>

      <div className="navbar-nav">
        <Link to="/" className={`navbar-link${location.pathname === '/' ? ' active' : ''}`}>HOME</Link>
        <Link to="/history" className={`navbar-link${location.pathname === '/history' ? ' active' : ''}`}>HISTORY</Link>
        {user && (
          <span className="navbar-link" style={{color:'var(--text-muted)'}}>
            {user.username.toUpperCase()}
          </span>
        )}
        {user && (
          <button
            onClick={handleLogout}
            className="navbar-link"
            style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontSize:'0.75rem',letterSpacing:'0.1em',textTransform:'uppercase'}}
          >
            LOGOUT
          </button>
        )}
        <div className="navbar-model-badge">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          GEMINI 1.5 FLASH
        </div>
      </div>
    </nav>
  )
}
