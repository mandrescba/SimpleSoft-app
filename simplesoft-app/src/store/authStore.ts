import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EmpresaDeUsuario, SesionResponse } from '../types/auth'

interface AuthState {
  token: string | null
  usuario: string | null
  nombre: string | null
  esSuperadmin: boolean
  empresas: EmpresaDeUsuario[]
  empresaActual: EmpresaDeUsuario | null
  debeCambiarClave: boolean
  /** Verdadero cuando la sesión se cerró sola por un 401 (token vencido) y no por un cierre manual. */
  sessionExpired: boolean
  setSesion: (s: SesionResponse) => void
  logout: () => void
  expireSession: () => void
  clearSessionExpired: () => void
}

const vacio = { token: null, usuario: null, nombre: null, esSuperadmin: false, empresas: [], empresaActual: null, debeCambiarClave: false }

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...vacio,
      sessionExpired: false,

      setSesion: (s) => {
        localStorage.setItem('token', s.token)
        set({
          token: s.token, usuario: s.usuario, nombre: s.nombre, esSuperadmin: s.esSuperadmin,
          empresas: s.empresas, empresaActual: s.empresaActual, debeCambiarClave: s.debeCambiarClave,
        })
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ ...vacio })
      },

      expireSession: () => {
        localStorage.removeItem('token')
        set({ ...vacio, sessionExpired: true })
      },

      clearSessionExpired: () => set({ sessionExpired: false }),
    }),
    { name: 'simplesoft-auth', partialize: (s) => ({ token: s.token, usuario: s.usuario, nombre: s.nombre, esSuperadmin: s.esSuperadmin, empresas: s.empresas, empresaActual: s.empresaActual, debeCambiarClave: s.debeCambiarClave }) },
  ),
)
