import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Sanitizes an object by removing common "junk" from React Query (context, signals, etc.)
 * that shouldn't be serialized into query strings.
 */
const sanitizeParams = (params: any) => {
  if (!params || typeof params !== 'object') return params
  
  const clean: any = {}
  Object.keys(params).forEach(key => {
    const val = params[key]
    // Filter out internal React Query / Event / Signal objects
    if (
      key === 'queryKey' || key === 'signal' || key === 'meta' || key === 'client' || 
      key === 'pageParam' || key === 'direction'
    ) {
      return
    }
    
    // Only keep primitives or simple arrays of primitives
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      clean[key] = val
    }
  })
  return Object.keys(clean).length > 0 ? clean : undefined
}

// Attach JWT token AND sanitize all requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  
  // Clean up params for ALL methods (GET, POST, etc.)
  if (config.params) {
    config.params = sanitizeParams(config.params)
  }
  
  return config
})

// Handle 401 — auto-refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          // Absolute path for refresh to avoid base prefix issues
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
          useAuthStore.getState().setAuth(data.access_token, data.refresh_token, data.role, data.user_id)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          useAuthStore.getState().clearAuth()
          window.location.href = '/login'
        }
      }
    }
    
    let message = error.response?.data?.detail || 'Something went wrong'
    if (Array.isArray(message)) {
      message = message.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ')
    }
    toast.error(typeof message === 'string' ? message : JSON.stringify(message))
    return Promise.reject(error)
  }
)

// API methods
// Note: We avoid trailing slashes for auth endpoints as they are strict in FastAPI
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  register: (data: object) =>
    api.post('/auth/register', data).then(r => r.data),
  logout: () => api.post('/auth/logout'),
}

// Others use trailing slashes where confirmed necessary to avoid 307 redirects
export const vehiclesAPI = {
  list: (params?: any) => api.get('/vehicles/', { params }).then(r => r.data),
  get: (id: string) => api.get(`/vehicles/${id}/`).then(r => r.data),
  create: (data: object) => api.post('/vehicles/', data).then(r => r.data),
  update: (id: string, data: object) => api.patch(`/vehicles/${id}/`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/vehicles/${id}/`),
  summary: () => api.get('/vehicles/summary/').then(r => r.data),
}

export const routesAPI = {
  list: (params?: any) => api.get('/routes/', { params }).then(r => r.data),
  get: (id: string) => api.get(`/routes/${id}/`).then(r => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/routes/${id}/status/`, { status }).then(r => r.data),
  reroute: (id: string, newSequence: string[]) =>
    api.post(`/routes/${id}/reroute/`, { new_sequence: newSequence }).then(r => r.data),
}

export const optimizationAPI = {
  optimize: (data: any) => api.post('/optimize/', data).then(r => r.data),
  predictETA: (data: any) => api.post('/optimize/eta/', data).then(r => r.data),
  incubate: (vehicleId: string) => api.post(`/optimize/incubate/${vehicleId}`).then(r => r.data),
}

export const telemetryAPI = {
  ingest: (data: object) => api.post('/telemetry/', data).then(r => r.data),
  history: (vehicleId: string, limit = 100) =>
    api.get(`/telemetry/${vehicleId}/history/`, { params: { limit } }).then(r => r.data),
  live: (vehicleId: string) => api.get(`/telemetry/${vehicleId}/live/`).then(r => r.data),
  logStoppage: (data: { vehicle_id: string, lat: number, lng: number, reason: string }) => 
    api.post('/telemetry/stoppages', data).then(r => r.data),
}

export const dashboardAPI = {
  kpis: () => api.get('/dashboard/kpis/').then(r => r.data),
}

export const shipmentsAPI = {
  list: (params?: any) => api.get('/shipments/', { params }).then(r => r.data),
  get: (id: string) => api.get(`/shipments/${id}/`).then(r => r.data),
  create: (data: object) => api.post('/shipments/', shipmentDataFormatter(data)).then(r => r.data),
  updateStatus: (id: string, status: string, params?: { lat?: number, lng?: number, received_by?: string, signature_data?: string }) => 
    api.patch(`/shipments/${id}/`, null, { params: { status, ...params } }).then(r => r.data),
}

const shipmentDataFormatter = (data: any) => {
  return {
    ...data,
    parcels: data.parcels.map((p: any) => ({
      ...p,
      weight_kg: Number(p.weight_kg),
      length_cm: Number(p.length_cm),
      width_cm: Number(p.width_cm),
      height_cm: Number(p.height_cm),
    }))
  }
}

export const deliveryPointsAPI = {
  list: (params?: any) => api.get('/routes/delivery-points/', { params }).then(r => r.data),
}

export const analyticsAPI = {
  insights: () => api.get('/analytics/insights/').then(r => r.data),
  metrics: () => api.get('/analytics/metrics/').then(r => r.data),
  activeMissions: () => api.get('/analytics/active-missions').then(r => r.data),
  syncSparkGPS: () => api.post('/analytics/sync-sparkgps').then(r => r.data),
}

export const usersAPI = {
  list: () => api.get('/users/').then(r => r.data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data).then(r => r.data),
}

export const trafficAPI = {
  simulateEvent: (lat: number, lng: number, type: string, severity: number) => 
    api.post('/traffic/event', { lat, lng, event_type: type, severity }).then(r => r.data),
}


export const telemetryWS = {
  getURL: () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_PROXY_TARGET 
      ? new URL(import.meta.env.VITE_PROXY_TARGET).host 
      : window.location.host
    return `${protocol}//${host}/api/v1/telemetry/ws`
  },
  connect: (onMessage: (data: any) => void) => {
    const ws = new WebSocket(telemetryWS.getURL())
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (err) {
        console.error('WS Parse Error', err)
      }
    }
    return ws
  }
}
