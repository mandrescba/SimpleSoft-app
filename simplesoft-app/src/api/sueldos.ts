import api from './axios'
import type { Concepto, ConceptoDetalle, ReciboCalculado, ResultadoValidacion } from '../types/sueldos'

/** La empresa NO se envía: el backend la toma del token. */
export const calcularRecibo = (legajo: string, periodo: string) =>
  api.post<ReciboCalculado>('/sueldos/recibos/calcular', { legajo, periodo }).then((r) => r.data)

export const getConceptos = () => api.get<Concepto[]>('/sueldos/conceptos').then((r) => r.data)

export const getConcepto = (codigo: string) => api.get<ConceptoDetalle>(`/sueldos/conceptos/${encodeURIComponent(codigo)}`).then((r) => r.data)
export const crearConcepto = (c: ConceptoDetalle) => api.post<ConceptoDetalle>('/sueldos/conceptos', c).then((r) => r.data)
export const modificarConcepto = (codigo: string, c: ConceptoDetalle) => api.put(`/sueldos/conceptos/${encodeURIComponent(codigo)}`, c).then((r) => r.data)
/** Comprueba una fórmula con el analizador del backend, sin guardar nada. */
export const validarFormula = (formula: string | null, codigo: string | null) =>
  api.post<ResultadoValidacion>('/sueldos/formulas/validar', { formula, codigo }).then((r) => r.data)
