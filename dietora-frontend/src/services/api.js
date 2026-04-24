import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // 120s — AI meal plan generation can take 20-60s
})

// ─── Request Interceptor: attach JWT ─────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dietora_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor: global error handling ─────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message

    if (status === 401) {
      localStorage.removeItem('dietora_token')
      // Don't redirect if already on auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        toast.error('Session expired. Please login again.')
        window.location.href = '/login'
      }
    } else if (status === 403) {
      toast.error('Access denied.')
    } else if (status === 429) {
      toast.error('Too many requests. Please wait a moment.')
    } else if (status >= 500) {
      toast.error('Server error. Please try again.')
    } else if (!error.response && error.code === 'ECONNREFUSED') {
      toast.error('Cannot connect to server. Is the backend running?')
    } else if (!error.response && error.code === 'ERR_NETWORK') {
      toast.error('Network error. Check your connection.')
    }
    // Let the calling code handle specific errors (400, 404, etc.)
    return Promise.reject(error)
  }
)

export default api
