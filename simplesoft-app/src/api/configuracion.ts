import api from './axios'
import type { RenglonConvenio } from '../types/sueldos'

/** Un concepto asignado fuera de un grupo (general o propio de un empleado), con sus valores propios. */
export interface RenglonForm { codigo: string; tipoLiquidacion: string; unidad: number | null; importe: number | null; vigenciaDesde: string | null; vigenciaHasta: string | null; orden: number | null }

// ---------------------------------------------------------------- tipos de novedad
export type TipoDatoNovedad = 'TEXTO' | 'ENTERO' | 'DECIMAL' | 'FECHA'
export interface TipoNovedad { idTipoNovedad: number; codigo: string; descripcion: string; tipoDato: TipoDatoNovedad; longitud: number | null; decimales: number | null; novedades: number }
export interface TipoNovedadForm { codigo: string; descripcion: string; tipoDato: TipoDatoNovedad; longitud: number | null; decimales: number | null }

export const getTiposNovedad = () => api.get<TipoNovedad[]>('/sueldos/tipos-novedad').then((r) => r.data)
export const crearTipoNovedad = (d: TipoNovedadForm) => api.post<TipoNovedad>('/sueldos/tipos-novedad', d).then((r) => r.data)
export const modificarTipoNovedad = (id: number, d: TipoNovedadForm) => api.put(`/sueldos/tipos-novedad/${id}`, d).then((r) => r.data)
export const eliminarTipoNovedad = (id: number) => api.delete(`/sueldos/tipos-novedad/${id}`).then((r) => r.data)

// ---------------------------------------------------------------- fórmulas auxiliares
export interface FormulaAux { idFormula: number; codigo: string; descripcion: string | null; formato: string | null; formula: string }
export interface FormulaAuxForm { codigo: string; descripcion: string | null; formato: string | null; formula: string }
export interface ResultadoValidacion { valida: boolean; error: string | null; advertencias: string[] }

export const getFormulasAux = () => api.get<FormulaAux[]>('/sueldos/formulas-auxiliares').then((r) => r.data)
export const crearFormulaAux = (d: FormulaAuxForm) => api.post<FormulaAux>('/sueldos/formulas-auxiliares', d).then((r) => r.data)
export const modificarFormulaAux = (id: number, d: FormulaAuxForm) => api.put(`/sueldos/formulas-auxiliares/${id}`, d).then((r) => r.data)
export const eliminarFormulaAux = (id: number) => api.delete(`/sueldos/formulas-auxiliares/${id}`).then((r) => r.data)
export const validarFormulaAux = (formula: string) => api.post<ResultadoValidacion>('/sueldos/formulas-auxiliares/validar', { formula }).then((r) => r.data)

// ---------------------------------------------------------------- tablas
export type TipoDatoTabla = 'TEXTO' | 'ENTERO' | 'DECIMAL' | 'FECHA' | 'LOGICO'
export interface ColumnaTabla { columna?: number; nombre: string; tipoDato: TipoDatoTabla; longitud: number | null; decimales: number | null }
export interface TablaResumen { idTabla: number; codigo: string; descripcion: string; columnas: number; filas: number }
export interface TablaEditable { idTabla: number; codigo: string; descripcion: string; columnas: ColumnaTabla[]; filas: (string | null)[][] }
export interface TablaForm { codigo: string; descripcion: string; columnas: ColumnaTabla[]; filas: (string | null)[][] }

export const getTablas = () => api.get<TablaResumen[]>('/sueldos/tablas').then((r) => r.data)
export const getTabla = (id: number) => api.get<TablaEditable>(`/sueldos/tablas/${id}`).then((r) => r.data)
export const crearTabla = (d: TablaForm) => api.post<TablaEditable>('/sueldos/tablas', d).then((r) => r.data)
export const guardarTabla = (id: number, d: TablaForm) => api.put(`/sueldos/tablas/${id}`, d).then((r) => r.data)
export const eliminarTabla = (id: number) => api.delete(`/sueldos/tablas/${id}`).then((r) => r.data)

// ---------------------------------------------------------------- conceptos generales y propios del empleado
export const getConceptosGenerales = () => api.get<RenglonConvenio[]>('/sueldos/conceptos-generales').then((r) => r.data)
export const guardarConceptoGeneral = (d: RenglonForm) => api.put('/sueldos/conceptos-generales', d).then((r) => r.data)
export const quitarConceptoGeneral = (codigo: string, tipo: string) =>
  api.delete(`/sueldos/conceptos-generales/${encodeURIComponent(codigo)}`, { params: { tipo } }).then((r) => r.data)

export interface GrupoAplicado { origen: 'EMPLEADO' | 'CONVENIO'; idGrupoConceptos: number; codigo: string; descripcion: string }
export interface ConceptosDelEmpleado { propios: RenglonConvenio[]; grupo: GrupoAplicado | null; delGrupo: RenglonConvenio[]; generales: RenglonConvenio[] }

export const getConceptosEmpleado = (id: number) => api.get<ConceptosDelEmpleado>(`/sueldos/empleados/${id}/conceptos`).then((r) => r.data)
export const guardarConceptoEmpleado = (id: number, d: RenglonForm) => api.put(`/sueldos/empleados/${id}/conceptos`, d).then((r) => r.data)
export const quitarConceptoEmpleado = (id: number, codigo: string, tipo: string) =>
  api.delete(`/sueldos/empleados/${id}/conceptos/${encodeURIComponent(codigo)}`, { params: { tipo } }).then((r) => r.data)
