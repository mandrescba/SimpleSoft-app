/**
 * Lee los permisos (<c>MODULO:accion</c>) que el backend metió en el token, solo para mostrar u ocultar menús.
 * No es seguridad: el backend vuelve a validar cada pedido.
 */
export function permisosDelToken(token: string | null): string[] {
  if (!token) return []
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.permisos === 'string' && payload.permisos ? payload.permisos.split(',') : []
  } catch {
    return []
  }
}

export const tienePermiso = (permisos: string[], modulo: string, accion = 'ver') => permisos.includes(`${modulo}:${accion}`)
