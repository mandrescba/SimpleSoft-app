import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/** Exige sesión iniciada. */
export function ProtectedRoute() {
  const { token, debeCambiarClave } = useAuthStore()
  const { pathname } = useLocation()
  if (!token) return <Navigate to="/login" replace />
  if (debeCambiarClave && pathname !== '/cambiar-clave') return <Navigate to="/cambiar-clave" replace />
  return <Outlet />
}

/** Exige además tener una empresa elegida (casi todo el sistema trabaja sobre una empresa). */
export function RequiereEmpresa() {
  const empresa = useAuthStore((s) => s.empresaActual)
  if (!empresa) return <Navigate to="/empresa" replace />
  return <Outlet />
}
