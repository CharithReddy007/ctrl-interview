import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import RolesPage from './pages/RolesPage'
import InterviewPage from './pages/InterviewPage'
import ReportPage from './pages/ReportPage'
import HistoryPage from './pages/HistoryPage'

function Protected({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={<Protected><HomePage /></Protected>} />
        <Route path="/roles" element={<Protected><RolesPage /></Protected>} />
        <Route path="/interview" element={<Protected><InterviewPage /></Protected>} />
        <Route path="/report" element={<Protected><ReportPage /></Protected>} />
        <Route path="/history" element={<Protected><HistoryPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
