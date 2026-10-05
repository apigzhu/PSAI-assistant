import { create } from 'zustand'

interface AuthState {
  token: string | null
  username: string | null
  userId: string | null
  isLoggedIn: boolean
  setAuth: (token: string, username: string, userId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('pias_token'),
  username: localStorage.getItem('pias_username'),
  userId: localStorage.getItem('pias_userId'),
  isLoggedIn: !!localStorage.getItem('pias_token'),

  setAuth: (token, username, userId) => {
    localStorage.setItem('pias_token', token)
    localStorage.setItem('pias_username', username)
    localStorage.setItem('pias_userId', userId)
    set({ token, username, userId, isLoggedIn: true })
  },

  logout: () => {
    localStorage.removeItem('pias_token')
    localStorage.removeItem('pias_username')
    localStorage.removeItem('pias_userId')
    set({ token: null, username: null, userId: null, isLoggedIn: false })
  },
}))
