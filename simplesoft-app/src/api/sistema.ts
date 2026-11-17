import api from './axios'
import type { Sucursal } from '../types/sueldos'
import type { EmpresaDeUsuario } from '../types/auth'
import type { ClaveTemporal, CuentaUsuario, EmpresaDetalle, MiCuenta, Rol, RolSistema, UsuarioDeEmpresa } from '../types/sistema'

// ---- usuarios de la empresa actual (la empresa la toma el backend del token)
export const getUsuarios = () => api.get<UsuarioDeEmpresa[]>('/sistema/usuarios').then((r) => r.data)
export const getRoles = () => api.get<Rol[]>('/sistema/roles').then((r) => r.data)

/** Roles de sistema que el usuario actual puede dar (todos el superadministrador; el resto, los asignables). */
export const getRolesSistema = () => api.get<RolSistema[]>('/sistema/roles-sistema').then((r) => r.data)
/** Rol de sistema del usuario y cuántas bases puede crear (y cuántas creó). */
export const getMiCuenta = () => api.get<MiCuenta>('/sistema/mi-cuenta').then((r) => r.data)

export const crearUsuario = (d: { usuario: string; nombre: string; email: string | null; idRol: number; rolSistema?: string; celular?: string | null }) =>
  api.post<ClaveTemporal>('/sistema/usuarios', d).then((r) => r.data)

/** rolSistema y maxBases (-1 = el del rol) solo los acepta el backend si quien guarda es superadministrador. */
/** celular: sin indicar no se toca; vacío lo borra. */
export const modificarUsuario = (id: number, d: { nombre: string; email: string | null; idRol: number; rolSistema?: string; maxBases?: number; celular?: string }) =>
  api.put(`/sistema/usuarios/${id}`, d).then((r) => r.data)

/** Todos los usuarios del sistema (solo superadministrador). */
export const getCuentas = () => api.get<CuentaUsuario[]>('/sistema/cuentas').then((r) => r.data)
/** celular: sin indicar no se toca, vacío lo borra; maxBases -1 = el límite del rol. */
export const modificarCuenta = (id: number, d: { nombre: string; email: string | null; celular?: string; rolSistema?: string; maxBases?: number }) =>
  api.put(`/sistema/cuentas/${id}`, d).then((r) => r.data)
export const reiniciarClaveCuenta = (id: number) => api.post<ClaveTemporal>(`/sistema/cuentas/${id}/reiniciar-clave`).then((r) => r.data)

export const reiniciarClave = (id: number) => api.post<ClaveTemporal>(`/sistema/usuarios/${id}/reiniciar-clave`).then((r) => r.data)

export const bajaUsuario = (id: number) => api.delete(`/sistema/usuarios/${id}`).then((r) => r.data)

// ---- empresas
export type EmpresaForm = Omit<EmpresaDetalle, 'idEmpresa' | 'activo' | 'tipo'>

/** Qué parte de la configuración de la empresa base se copia al crear una empresa. */
export interface OpcionesCopia { conceptos: boolean; tablas: boolean; convenios: boolean; novedades: boolean; informes: boolean }
export interface EmpresaCreada { empresa: EmpresaDetalle; copiados: Record<string, number> | null }

export const getEmpresas = () => api.get<EmpresaDetalle[]>('/sistema/empresas').then((r) => r.data)
/** Empresas de las que se puede copiar la configuración al crear una: MASTER, DEMO y las vinculadas al usuario (también si es superadministrador). */
export const getBasesParaCopiar = () => api.get<EmpresaDeUsuario[]>('/sistema/empresas/bases-copia').then((r) => r.data)
export const crearEmpresa = (d: EmpresaForm, idEmpresaBase?: number | null, copiar?: OpcionesCopia, tipo = 'CLIENTE') =>
  api.post<EmpresaCreada>('/sistema/empresas', { ...d, idEmpresaBase: idEmpresaBase ?? null, copiar: idEmpresaBase ? copiar : null, tipo }).then((r) => r.data)
/** Pasa una empresa de prueba a producción (sin vuelta atrás). Con limpiar borra antes los empleados, novedades y liquidaciones de prueba. Devuelve cuántos registros se borraron por tabla. */
export const pasarAProduccion = (id: number, limpiar: boolean) => api.post<Record<string, number>>(`/sistema/empresas/${id}/pasar-a-produccion`, { limpiar }).then((r) => r.data)
export const modificarEmpresa = (id: number, d: EmpresaForm) => api.put(`/sistema/empresas/${id}`, d).then((r) => r.data)
export const eliminarEmpresa = (id: number, confirmacion: string) => api.post<{ total: number }>(`/sistema/empresas/${id}/eliminar-definitivamente`, { confirmacion }).then((r) => r.data)
export const bajaEmpresa =(id: number) => api.delete(`/sistema/empresas/${id}`).then((r) => r.data)
export const reactivarEmpresa = (id: number) => api.post(`/sistema/empresas/${id}/reactivar`).then((r) => r.data)

// ---- sucursales y recibo de la empresa actual
export type SucursalForm = Omit<Sucursal, 'idSucursal' | 'activo'>
export const getSucursales = () => api.get<Sucursal[]>('/sistema/sucursales', { params: { incluirBajas: true } }).then((r) => r.data)
export const crearSucursal = (d: SucursalForm) => api.post<Sucursal>('/sistema/sucursales', d).then((r) => r.data)
export const modificarSucursal = (id: number, d: SucursalForm) => api.put(`/sistema/sucursales/${id}`, d).then((r) => r.data)
export const bajaSucursal = (id: number) => api.delete(`/sistema/sucursales/${id}`).then((r) => r.data)
export const reactivarSucursal = (id: number) => api.post(`/sistema/sucursales/${id}/reactivar`).then((r) => r.data)

export interface ConfigRecibo { tieneLogo: boolean; formato: 'DOBLE' | 'SIMPLE' }
export const getConfigRecibo = () => api.get<ConfigRecibo>('/sistema/recibo-config').then((r) => r.data)
export const setFormatoRecibo = (formato: string) => api.put('/sistema/recibo-config/formato', { formato }).then((r) => r.data)
export const subirLogo = (archivo: File) => {
  const fd = new FormData()
  fd.append('archivo', archivo)
  return api.put('/sistema/recibo-config/logo', fd).then((r) => r.data)
}
export const quitarLogo = () => api.delete('/sistema/recibo-config/logo').then((r) => r.data)
/** El logo se baja con el token (un <img src> directo no lleva el Authorization). */
export const getLogoUrl = () => api.get('/sistema/recibo-config/logo', { responseType: 'blob' }).then((r) => URL.createObjectURL(r.data as Blob))
