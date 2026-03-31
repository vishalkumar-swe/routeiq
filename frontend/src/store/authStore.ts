import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  refreshToken: string | null
  role: string | null
  userId: string | null
  setAuth: (token: string, refreshToken: string, role: string, userId: string) => void

  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      role: null,
      userId: null,
  setAuth: (token: string, refreshToken: string, role: string, userId: string) => set({ token, refreshToken, role, userId }),
  clearAuth: () => set({ token: null, refreshToken: null, role: null, userId: null }),
}),

    { name: 'routeiq-auth' }
  )
)
