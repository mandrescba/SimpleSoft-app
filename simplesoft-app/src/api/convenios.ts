import api from './axios'
import type { CategoriaConvenio, ConvenioDetalle, EscalaCategoria, ObraSocialOpcion, RenglonConvenio } from '../types/sueldos'

export type ConvenioForm = Omit<ConvenioDetalle, 'idConvenio' | 'obraSocial' | 'categorias'>

export const getConvenios = (incluirBajas = false) => api.get<ConvenioDetalle[]>('/sueldos/convenios', { params: { incluirBajas } }).then((r) => r.data)
export const getConvenio = (id: number) =>
  api.get<{ convenio: ConvenioDetalle; categorias: CategoriaConvenio[] }>(`/sueldos/convenios/${id}`).then((r) => r.data)
export const crearConvenio = (d: ConvenioForm) => api.post<ConvenioDetalle>('/sueldos/convenios', d).then((r) => r.data)
export const modificarConvenio = (id: number, d: ConvenioForm) => api.put(`/sueldos/convenios/${id}`, d).then((r) => r.data)
export const bajaConvenio = (id: number) => api.delete(`/sueldos/convenios/${id}`).then((r) => r.data)
export const reactivarConvenio = (id: number) => api.post(`/sueldos/convenios/${id}/reactivar`).then((r) => r.data)
export const crearGrupoConvenio = (id: number) => api.post<{ idGrupoConceptos: number }>(`/sueldos/convenios/${id}/grupo`).then((r) => r.data)
export const buscarObrasSociales = (buscar: string) => api.get<ObraSocialOpcion[]>('/sueldos/convenios/obras-sociales', { params: { buscar } }).then((r) => r.data)

export interface CategoriaForm { codigo: string; descripcion: string; jornada: string | null; orden: number; vigenciaDesde?: string | null; sueldo?: number | null; adicional?: number | null; auxiliar?: number | null }
export const crearCategoria = (id: number, d: CategoriaForm) => api.post(`/sueldos/convenios/${id}/categorias`, d).then((r) => r.data)
export const modificarCategoria = (id: number, idCat: number, d: CategoriaForm) => api.put(`/sueldos/convenios/${id}/categorias/${idCat}`, d).then((r) => r.data)
export const eliminarCategoria = (id: number, idCat: number) => api.delete(`/sueldos/convenios/${id}/categorias/${idCat}`).then((r) => r.data)

export const getEscalas = (id: number, idCat: number) => api.get<EscalaCategoria[]>(`/sueldos/convenios/${id}/categorias/${idCat}/escalas`).then((r) => r.data)
export const agregarEscala = (id: number, idCat: number, d: { vigenciaDesde: string; sueldo: number; adicional: number | null; auxiliar: number | null }) =>
  api.post(`/sueldos/convenios/${id}/categorias/${idCat}/escalas`, d).then((r) => r.data)
export const eliminarEscala = (id: number, idCat: number, desde: string) => api.delete(`/sueldos/convenios/${id}/categorias/${idCat}/escalas`, { params: { desde } }).then((r) => r.data)

export interface RenglonForm { codigo: string; tipoLiquidacion: string; unidad: number | null; importe: number | null; vigenciaDesde: string | null; vigenciaHasta: string | null; orden: number | null }
export const getConceptosConvenio = (id: number) => api.get<RenglonConvenio[]>(`/sueldos/convenios/${id}/conceptos`).then((r) => r.data)
export const guardarConceptoConvenio = (id: number, d: RenglonForm) => api.put(`/sueldos/convenios/${id}/conceptos`, d).then((r) => r.data)
export const quitarConceptoConvenio = (id: number, codigo: string, tipo: string) =>
  api.delete(`/sueldos/convenios/${id}/conceptos/${encodeURIComponent(codigo)}`, { params: { tipo } }).then((r) => r.data)
