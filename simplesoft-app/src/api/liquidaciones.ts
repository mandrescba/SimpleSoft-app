import api from './axios'
import type { CalculoConcepto, HistorialLiquidacion, LiquidacionDetalle, LiquidacionResumen, LiquidarResponse, ReciboGuardado, ResultadoLiquidarEmpleado } from '../types/sueldos'

export interface NuevaLiquidacion {
  periodo: string
  tipo: string
  fecha: string
  fechaDesde: string
  fechaHasta: string
  descripcion: string | null
  fechaPago: string | null
  lugarPago?: string | null
  fechaDeposito?: string | null
  periodoDeposito?: string | null
  bancoDeposito?: string | null
  grupoEmpleados?: string | null
  filtroConceptos?: string | null
  /** Solo el aguinaldo (tipo SAC): 1 o 2. */
  semestre?: number | null
}

export const getLiquidaciones = () => api.get<LiquidacionResumen[]>('/sueldos/liquidaciones').then((r) => r.data)
export const getLiquidacion = (id: number) => api.get<LiquidacionDetalle>(`/sueldos/liquidaciones/${id}`).then((r) => r.data)
export const crearLiquidacion = (d: NuevaLiquidacion) => api.post<LiquidacionResumen>('/sueldos/liquidaciones', d).then((r) => r.data)
export const modificarLiquidacion = (id: number, d: Pick<NuevaLiquidacion, 'descripcion' | 'fechaPago' | 'lugarPago' | 'fechaDeposito' | 'periodoDeposito' | 'bancoDeposito' | 'grupoEmpleados' | 'filtroConceptos'>) => api.put(`/sueldos/liquidaciones/${id}`, d).then((r) => r.data)
export const eliminarLiquidacion = (id: number) => api.delete(`/sueldos/liquidaciones/${id}`).then((r) => r.data)
/** Cambios de fase: Carga, Liquidación, Cerrada. Reabrir una cerrada exige el motivo. */
export const pasarALiquidacion = (id: number) => api.post(`/sueldos/liquidaciones/${id}/pasar-a-liquidacion`, {}).then((r) => r.data)
export const volverACarga = (id: number) => api.post(`/sueldos/liquidaciones/${id}/volver-a-carga`, {}).then((r) => r.data)
export const cerrarLiquidacion = (id: number) => api.post(`/sueldos/liquidaciones/${id}/cerrar`, {}).then((r) => r.data)
export const reabrirLiquidacion = (id: number, motivo: string) => api.post(`/sueldos/liquidaciones/${id}/reabrir`, { motivo }).then((r) => r.data)
export const getHistorialLiquidacion = (id: number) => api.get<HistorialLiquidacion[]>(`/sueldos/liquidaciones/${id}/historial`).then((r) => r.data)
/** Opciones al liquidar: solo algunos legajos, con los conceptos de un grupo, o tomando otra liquidación como base (duplicar el período). */
export interface OpcionesLiquidar { legajos?: string[]; idGrupoConceptos?: number; duplicarDe?: number }
export const liquidar = (id: number, opciones?: OpcionesLiquidar) => api.post<LiquidarResponse>(`/sueldos/liquidaciones/${id}/liquidar`, opciones ?? {}).then((r) => r.data)

/** Crea un recibo numerado adicional del empleado (2, 3...): con o sin los conceptos automáticos, más los que se indiquen. */
export const crearReciboNumerado = (id: number, idEmpleado: number, d: { conAutomaticos: boolean; codigos: string[] }) =>
  api.post<ResultadoLiquidarEmpleado>(`/sueldos/liquidaciones/${id}/recibos/${idEmpleado}/numerados`, d).then((r) => r.data)

export const getRecibo = (id: number, idRecibo: number) => api.get<ReciboGuardado>(`/sueldos/liquidaciones/${id}/recibos/${idRecibo}`).then((r) => r.data)
/** Cómo se calculó un concepto en un recibo: fórmulas, valores de las variables y la causa de una división por cero. */
export const getCalculoConcepto = (id: number, idRecibo: number, codigo: string) =>
  api.get<CalculoConcepto>(`/sueldos/liquidaciones/${id}/recibos/${idRecibo}/conceptos/${encodeURIComponent(codigo)}/calculo`).then((r) => r.data)
export const eliminarRecibo = (id: number, idRecibo: number) => api.delete(`/sueldos/liquidaciones/${id}/recibos/${idRecibo}`).then((r) => r.data)

export type ManualesRecibo = Record<string, { unidad: number | null; importe: number | null }>
export const recalcularRecibo = (id: number, idEmpleado: number, manuales: ManualesRecibo, numero = 1) =>
  api.post<ResultadoLiquidarEmpleado>(`/sueldos/liquidaciones/${id}/recibos/${idEmpleado}/recalcular`, { manuales }, { params: { numero } }).then((r) => r.data)

/** Baja el PDF con el token (un enlace directo no lleva el Authorization) y lo abre en una pestaña nueva. */
/** Abre el PDF del recibo. conCosto = con el formato del Decreto 407/2026 (costo total del empleador y gráfico de torta); si no, el recibo de siempre. */
export async function abrirPdfRecibo(id: number, idRecibo: number, conCosto = false) {
  const r = await api.get(`/sueldos/liquidaciones/${id}/recibos/${idRecibo}/${conCosto ? 'pdf-costo' : 'pdf'}`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Abre en un solo PDF todos los recibos de la liquidación con el formato del Decreto 407/2026 (uno por hoja). */
export async function abrirPdfRecibosCosto(id: number) {
  const r = await api.get(`/sueldos/liquidaciones/${id}/recibos/pdf-costo`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Agrega un concepto al recibo de un empleado y lo recalcula (el recibo se vuelve a grabar con otro id). */
export const agregarConceptoRecibo = (id: number, idEmpleado: number, codigo: string, numero = 1) =>
  api.post<ResultadoLiquidarEmpleado>(`/sueldos/liquidaciones/${id}/recibos/${idEmpleado}/conceptos`, { codigo }, { params: { numero } }).then((r) => r.data)
export const quitarConceptoRecibo = (id: number, idEmpleado: number, codigo: string, numero = 1) =>
  api.delete<ResultadoLiquidarEmpleado>(`/sueldos/liquidaciones/${id}/recibos/${idEmpleado}/conceptos/${encodeURIComponent(codigo)}`, { params: { numero } }).then((r) => r.data)

/** Observaciones y fecha de liquidación final de un recibo (no recalcula; se conservan al recalcular). */
export const guardarDatosRecibo = (id: number, idRecibo: number, d: { observaciones: string | null; liquidacionFinal: string | null }) =>
  api.put(`/sueldos/liquidaciones/${id}/recibos/${idRecibo}/datos`, d).then((r) => r.data)
