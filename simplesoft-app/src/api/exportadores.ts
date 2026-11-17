import api from './axios'
import { guardarBlob } from './informes'

export type TablaExportador = 'RECIBOS' | 'CONCEPTOS_RECIBO' | 'EMPLEADOS' | 'FAMILIARES'
export type TipoDatoCampo = 'TEXTO' | 'ENTERO' | 'DECIMAL' | 'FECHA'
export type FormatoDecimal = 'PUNTO' | 'COMA' | 'MILES' | 'SIN_SEPARADOR'

export interface CampoExportador { nombre: string; tipoDato: TipoDatoCampo; longitud: number | null; decimales: number | null; formatoDecimal: FormatoDecimal | null; formula: string | null }
export interface ExportadorForm {
  codigo: string; descripcion: string; tabla: TablaExportador; separador: string | null; formatoDecimal: FormatoDecimal; formatoFecha: string; codificacion: 'UTF8' | 'ANSI'
  conEncabezado: boolean; formulaCondicion: string | null; formulaArchivo: string | null; activo: boolean; orden: number; campos: CampoExportador[]
}
export interface ExportadorDetalle extends ExportadorForm { idExportador: number }
export interface ExportadorResumen { idExportador: number; codigo: string; descripcion: string; tabla: TablaExportador; campos: number; activo: boolean }
export interface VariableExportacion { nombre: string; descripcion: string }
export interface FiltroEjecucion { idLiquidacion?: number; desde?: string; hasta?: string; incluirBajas?: boolean; limite?: number; omitirConError?: boolean }
export interface ErrorFilaExportacion { fila: string; campo: string; mensaje: string }
export interface VistaExportacion { filas: number; excluidas: number; conError: number; lineas: string[]; errores: ErrorFilaExportacion[]; nombreArchivo: string | null }

export const TABLAS: { v: TablaExportador; t: string; ayuda: string }[] = [
  { v: 'RECIBOS', t: 'Recibos', ayuda: 'Una fila por recibo de una liquidación.' },
  { v: 'CONCEPTOS_RECIBO', t: 'Conceptos de recibo', ayuda: 'Una fila por cada concepto de cada recibo.' },
  { v: 'EMPLEADOS', t: 'Empleados', ayuda: 'Una fila por empleado.' },
  { v: 'FAMILIARES', t: 'Familiares', ayuda: 'Una fila por familiar de cada empleado.' },
]

export const getExportadores = () => api.get<ExportadorResumen[]>('/sueldos/exportadores').then((r) => r.data)
export const getExportador = (id: number) => api.get<ExportadorDetalle>(`/sueldos/exportadores/${id}`).then((r) => r.data)
export const getVariablesExportador = (tabla: string) => api.get<VariableExportacion[]>('/sueldos/exportadores/variables', { params: { tabla } }).then((r) => r.data)
export const crearExportador = (d: ExportadorForm) => api.post<ExportadorDetalle>('/sueldos/exportadores', d).then((r) => r.data)
export const modificarExportador = (id: number, d: ExportadorForm) => api.put(`/sueldos/exportadores/${id}`, d).then((r) => r.data)
export const eliminarExportador = (id: number) => api.delete(`/sueldos/exportadores/${id}`).then((r) => r.data)
export const vistaExportador = (id: number, f: FiltroEjecucion) => api.post<VistaExportacion>(`/sueldos/exportadores/${id}/vista`, f).then((r) => r.data)

/** Nombre de archivo que manda la API en Content-Disposition (filename* o filename). */
export function nombreDe(cabecera: string | undefined, porDefecto: string): string {
  if (!cabecera) return porDefecto
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecera)
  if (utf8) return decodeURIComponent(utf8[1])
  const simple = /filename="?([^";]+)"?/i.exec(cabecera)
  return simple ? simple[1] : porDefecto
}

/** Genera el archivo y lo baja con el token. Si algo falla, el error llega como blob: se lee con <c>mensajeDeBlob</c>. */
export async function bajarExportacion(id: number, f: FiltroEjecucion): Promise<string> {
  const r = await api.post(`/sueldos/exportadores/${id}/exportar`, f, { responseType: 'blob' })
  const nombre = nombreDe(r.headers['content-disposition'] as string | undefined, 'exportacion.txt')
  guardarBlob(r.data, (r.headers['content-type'] as string | undefined) ?? 'application/octet-stream', nombre, false)
  return nombre
}
