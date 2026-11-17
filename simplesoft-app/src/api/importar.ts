import api from './axios'
import { guardarBlob } from './informes'

export interface ColumnaImport {
  clave: string; titulo: string; obligatoria: boolean; tipo: 'texto' | 'numero' | 'entero' | 'fecha' | 'lista'
  descripcion: string; ejemplo: string; valores: string[] | null; alias: string[] | null
}
export interface DefinicionImport { tipo: string; nombre: string; descripcion: string; indicaciones: string; columnas: ColumnaImport[]; nombreHoja: string }
export interface TablaReferencia { nombre: string; ayuda: string; encabezados: string[]; filas: string[][] }
export interface FormatoImport { definicion: DefinicionImport; referencias: TablaReferencia[] }
export interface HojaExcel { nombre: string; filas: number; columnas: number; vista: string[][] }
export interface ColumnasImport { encabezados: string[]; sugerido: Record<string, number>; muestra: (string | null)[][]; totalFilas: number }
export interface OpcionesImport { existentes: 'omitir' | 'actualizar'; periodo?: string }
export interface FilaImport { fila: number; estado: 'ok' | 'error' | 'omitida'; accion: string; etiqueta: string; mensajes: string[] }
export interface ResultadoImport {
  aplicado: boolean; total: number; validas: number; conErrores: number; omitidas: number; aCrear: number; aActualizar: number; importadas: number; filas: FilaImport[]
}

export const TIPOS_IMPORTACION: { tipo: string; label: string }[] = [
  { tipo: 'empleados', label: 'Empleados' },
  { tipo: 'novedades', label: 'Novedades (una por fila)' },
  { tipo: 'novedades-columnas', label: 'Novedades (una columna por tipo)' },
]

export const getFormatoImport = (tipo: string) => api.get<FormatoImport>(`/sueldos/importar/${tipo}/formato`).then((r) => r.data)

/** Baja la plantilla de Excel (instrucciones, hoja vacía, ejemplo y referencias de la empresa). */
export async function bajarPlantilla(tipo: string) {
  const r = await api.get(`/sueldos/importar/${tipo}/plantilla`, { responseType: 'blob' })
  guardarBlob(r.data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `plantilla_${tipo}.xlsx`, false)
}

function form(archivo: File, extra: { hoja?: string; filaEncabezado?: number; mapeo?: Record<string, number>; opciones?: OpcionesImport }) {
  const f = new FormData()
  f.append('archivo', archivo)
  if (extra.hoja !== undefined) f.append('hoja', extra.hoja)
  f.append('filaEncabezado', String(extra.filaEncabezado ?? 1))
  if (extra.mapeo) f.append('mapeo', JSON.stringify(extra.mapeo))
  if (extra.opciones) f.append('opciones', JSON.stringify(extra.opciones))
  return f
}

export const getHojas = (archivo: File) => api.post<HojaExcel[]>('/sueldos/importar/hojas', form(archivo, {})).then((r) => r.data)
export const getColumnas = (tipo: string, archivo: File, hoja: string, filaEncabezado: number) =>
  api.post<ColumnasImport>(`/sueldos/importar/${tipo}/columnas`, form(archivo, { hoja, filaEncabezado })).then((r) => r.data)
export const validarImport = (tipo: string, archivo: File, hoja: string, filaEncabezado: number, mapeo: Record<string, number>, opciones: OpcionesImport) =>
  api.post<ResultadoImport>(`/sueldos/importar/${tipo}/validar`, form(archivo, { hoja, filaEncabezado, mapeo, opciones })).then((r) => r.data)
export const importarDatos = (tipo: string, archivo: File, hoja: string, filaEncabezado: number, mapeo: Record<string, number>, opciones: OpcionesImport) =>
  api.post<ResultadoImport>(`/sueldos/importar/${tipo}/importar`, form(archivo, { hoja, filaEncabezado, mapeo, opciones })).then((r) => r.data)
