import api from './axios'
import type { RenglonConvenio } from '../types/sueldos'

export interface GrupoDetalle { idGrupoConceptos: number; codigo: string; descripcion: string; conceptos: number; enUso: number }
export interface GrupoDeConcepto { idGrupoConceptos: number; codigo: string; descripcion: string; tipoLiquidacion: string; unidad: number | null; importe: number | null; vigenciaDesde: string | null; vigenciaHasta: string | null }
export interface RenglonGrupoForm { codigo: string; tipoLiquidacion: string; unidad: number | null; importe: number | null; vigenciaDesde: string | null; vigenciaHasta: string | null; orden: number | null }

export const getGrupos = () => api.get<GrupoDetalle[]>('/sueldos/grupos').then((r) => r.data)
export const crearGrupo = (codigo: string, descripcion: string) => api.post<GrupoDetalle>('/sueldos/grupos', { codigo, descripcion }).then((r) => r.data)
export const modificarGrupo = (id: number, descripcion: string) => api.put(`/sueldos/grupos/${id}`, { codigo: '', descripcion }).then((r) => r.data)
export const eliminarGrupo = (id: number) => api.delete(`/sueldos/grupos/${id}`).then((r) => r.data)
export const getConceptosGrupo = (id: number) => api.get<RenglonConvenio[]>(`/sueldos/grupos/${id}/conceptos`).then((r) => r.data)
export const guardarConceptoGrupo = (id: number, d: RenglonGrupoForm) => api.put(`/sueldos/grupos/${id}/conceptos`, d).then((r) => r.data)
export const quitarConceptoGrupo = (id: number, codigo: string, tipo: string) =>
  api.delete(`/sueldos/grupos/${id}/conceptos/${encodeURIComponent(codigo)}`, { params: { tipo } }).then((r) => r.data)
export const getGruposDeConcepto = (codigo: string) => api.get<GrupoDeConcepto[]>(`/sueldos/conceptos/${encodeURIComponent(codigo)}/grupos`).then((r) => r.data)
