import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { navigateTo } from '../lib/navigation'

// En desarrollo, /api pasa por el proxy de Vite; en producción VITE_API_BASE trae la dirección de la API publicada.
const api = axios.create({ baseURL: `${import.meta.env.VITE_API_BASE ?? ''}/api` })

// El JWT viaja en cada pedido
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Un 401 fuera del login es una sesión vencida: se cierra y se vuelve al ingreso.
// Un 403 con cambiarClave (clave inicial o reiniciada) lleva a la pantalla de cambio de clave.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url: string = error.config?.url ?? ''
    if (error.response?.status === 401 && !url.includes('/auth/login')) {
      useAuthStore.getState().expireSession()
      navigateTo('/login', { replace: true })
    }
    if (error.response?.status === 403 && error.response?.data?.cambiarClave) navigateTo('/cambiar-clave', { replace: true })
    return Promise.reject(error)
  },
)

/** Mensaje legible de un error de la API (el backend responde { error: "..." }). */
export function mensajeDeError(e: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
  const data = (e as { response?: { data?: { error?: string } } })?.response?.data
  return data?.error ?? porDefecto
}

export default api
