import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, type User } from '@/lib/api'
import { startAuthentication } from '@simplewebauthn/browser'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ requiresTOTP: boolean }>
  loginWithTOTP: (username: string, password: string, totpToken: string) => Promise<void>
  loginWithPasskey: () => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  loginWithToken: (token: string) => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const response = await api.login(username, password)
        
        if ('requiresTOTP' in response) {
          return { requiresTOTP: true }
        }
        
        api.setToken(response.token)
        set({ user: response.user, isAuthenticated: true })
        return { requiresTOTP: false }
      },

      loginWithTOTP: async (username: string, password: string, totpToken: string) => {
        const response = await api.loginWithTOTP(username, password, totpToken)
        api.setToken(response.token)
        set({ user: response.user, isAuthenticated: true })
      },

      loginWithPasskey: async () => {
        // Get login options
        const options = await api.getPasskeyLoginOptions()
        
        // Start authentication
        const response = await startAuthentication(options)
        
        // Complete login
        const loginResponse = await api.loginWithPasskey(response)
        
        // Set token and user data
        api.setToken(loginResponse.token)
        set({ user: loginResponse.user, isAuthenticated: true })
      },

      register: async (username: string, email: string, password: string) => {
        const response = await api.register(username, email, password)
        api.setToken(response.token)
        set({ user: response.user, isAuthenticated: true })
      },

      logout: () => {
        api.setToken(null)
        set({ user: null, isAuthenticated: false })
      },

      checkAuth: async () => {
        try {
          const response = await api.getCurrentUser()
          set({ user: response.user, isAuthenticated: true })
        } catch (error) {
          console.log('🔧 Auth Store - checkAuth failed, clearing auth state:', error)
          // Token is invalid, clear auth state
          api.setToken(null)
          set({ user: null, isAuthenticated: false })
        }
      },

      loginWithToken: async (token: string) => {
        console.log('🔧 Auth Store - loginWithToken called with:', token.substring(0, 50) + '...')
        api.setToken(token)
        try {
          console.log('🔧 Auth Store - Calling getCurrentUser...')
          const response = await api.getCurrentUser()
          console.log('🔧 Auth Store - getCurrentUser success:', response.user.username)
          set({ user: response.user, isAuthenticated: true })
        } catch (error) {
          // Token is invalid, clear auth state
          console.error('🔧 Auth Store - getCurrentUser failed:', error)
          api.setToken(null)
          set({ user: null, isAuthenticated: false })
          throw new Error('Invalid token')
        }
      },
    }),
    {
      name: 'leelo-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)