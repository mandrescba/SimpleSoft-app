import api from './axios'
import type { CatalogosSueldos, DatosArca, EmpleadoDetalle, EmpleadoLista, Familiar, Novedad } from '../types/sueldos'

export const getCatalogos = () => api.get<CatalogosSueldos>('/sueldos/catalogos').then((r) => r.data)

export const getEmpleados = (buscar: string, incluirBajas: boolean) =>
  api.get<EmpleadoLista[]>('/sueldos/empleados', { params: { buscar: buscar || undefined, incluirBajas } }).then((r) => r.data)

export const getEmpleado = (id: number) => api.get<EmpleadoDetalle>(`/sueldos/empleados/${id}`).then((r) => r.data)
export const crearEmpleado = (d: Partial<EmpleadoDetalle>) => api.post<EmpleadoDetalle>('/sueldos/empleados', d).then((r) => r.data)
export const modificarEmpleado = (id: number, d: Partial<EmpleadoDetalle>) => api.put(`/sueldos/empleados/${id}`, d).then((r) => r.data)
export const bajaEmpleado = (id: number, fechaEgreso: string | null) => api.post(`/sueldos/empleados/${id}/baja`, { fechaEgreso }).then((r) => r.data)
export const reactivarEmpleado = (id: number) => api.post(`/sueldos/empleados/${id}/reactivar`).then((r) => r.data)

export const getArca = (id: number) => api.get<DatosArca>(`/sueldos/empleados/${id}/arca`).then((r) => r.data)
export const getHistorialArca = (id: number) => api.get<DatosArca[]>(`/sueldos/empleados/${id}/arca/historial`).then((r) => r.data)
export const guardarArca = (id: number, d: DatosArca) => api.put(`/sueldos/empleados/${id}/arca`, d).then((r) => r.data)

export const getFamiliares = (id: number) => api.get<Familiar[]>(`/sueldos/empleados/${id}/familiares`).then((r) => r.data)
export const agregarFamiliar = (id: number, f: Partial<Familiar>) => api.post<Familiar>(`/sueldos/empleados/${id}/familiares`, f).then((r) => r.data)
export const modificarFamiliar = (id: number, idFam: number, f: Partial<Familiar>) => api.put(`/sueldos/empleados/${id}/familiares/${idFam}`, f).then((r) => r.data)
export const eliminarFamiliar = (id: number, idFam: number) => api.delete(`/sueldos/empleados/${id}/familiares/${idFam}`).then((r) => r.data)

export const getNovedades = (id: number, anio: number) => api.get<Novedad[]>(`/sueldos/empleados/${id}/novedades`, { params: { anio } }).then((r) => r.data)
export const guardarNovedad = (id: number, d: { codigoTipo: string; fecha: string; valor: string | null }) => api.put(`/sueldos/empleados/${id}/novedades`, d).then((r) => r.data)
export const eliminarNovedad = (id: number, codigoTipo: string, fecha: string) =>
  api.delete(`/sueldos/empleados/${id}/novedades`, { params: { codigoTipo, fecha } }).then((r) => r.data)
