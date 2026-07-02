import axios from 'axios'

// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.js).
// In production (Vercel), there is no proxy, so we call the deployed backend
// directly via an env var you set in the Vercel dashboard.
const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)

// Resume
export const parsePDF = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/resume/parse-pdf', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const parseText = (text) => api.post('/resume/parse-text', { text })

// Interview
export const startInterview = (resume_context, role) =>
  api.post('/interview/start', { resume_context, role })
export const submitAnswer = (payload) => api.post('/interview/answer', payload)
export const getSessions = () => api.get('/interview/sessions')
export const getReport = (id) => api.get(`/interview/report/${id}`)
export const endInterview = (id) => api.post(`/interview/${id}/end`)
export const analyzeAudio = (fd) => api.post('/interview/audio-analysis', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
