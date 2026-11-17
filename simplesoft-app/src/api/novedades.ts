import api from './axios'

export type Periodicidad = 'MENSUAL' | 'SEMANAL' | 'DIARIA'
export interface EmpleadoNovedad { idEmpleado: number; legajo: string; nombre: string; grupo: string | null; centroCosto: string | null }
export interface CeldaNovedad { idEmpleado: number; fecha: string; valor: string | null }
export interface GrillaNovedades { codigoTipo: string; tipoDato: string; decimales: number | null; empleados: EmpleadoNovedad[]; fechas: string[]; valores: CeldaNovedad[] }
export interface ResultadoLote { creadas: number; modificadas: number; eliminadas: number; omitidas: number }
export interface FiltroGrilla { codigoTipo: string; periodicidad: Periodicidad; desde: string; hasta: string; grupo?: string; centroCosto?: string; buscar?: string; incluirBajas?: boolean }

export interface NovedadAutomatica {
  codigoTipo: string; periodicidad: Periodicidad; desde: string; hasta: string; valor: string; modo: 'CREAR' | 'MODIFICAR' | 'AMBOS'
  grupo?: string; centroCosto?: string; legajos?: string[]
}
export interface EmpleadoAfectado { legajo: string; nombre: string; aCrear: number; aModificar: number }
export interface VistaAutomatica { empleados: EmpleadoAfectado[]; fechas: number; aCrear: number; aModificar: number }

const limpiar = (f: FiltroGrilla) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '' && v !== false))

export const getGrilla = (f: FiltroGrilla) => api.get<GrillaNovedades>('/sueldos/novedades/grilla', { params: limpiar(f) }).then((r) => r.data)
export const guardarLote = (codigoTipo: string, celdas: { idEmpleado: number; fecha: string; valor: string | null }[]) =>
  api.put<ResultadoLote>('/sueldos/novedades/lote', { codigoTipo, celdas }).then((r) => r.data)
export const vistaAutomatica = (p: NovedadAutomatica) => api.post<VistaAutomatica>('/sueldos/novedades/automaticas/vista', p).then((r) => r.data)
export const aplicarAutomatica = (p: NovedadAutomatica) => api.post<ResultadoLote>('/sueldos/novedades/automaticas/aplicar', p).then((r) => r.data)
