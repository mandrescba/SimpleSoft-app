import type { NavigateFunction } from 'react-router-dom'

// Puente para navegar desde fuera de React (por ejemplo el interceptor de axios).
let navigateRef: NavigateFunction | null = null

export function setNavigate(fn: NavigateFunction) {
  navigateRef = fn
}

export function navigateTo(path: string, opts?: { replace?: boolean }) {
  if (navigateRef) navigateRef(path, opts)
  else window.location.href = path
}
