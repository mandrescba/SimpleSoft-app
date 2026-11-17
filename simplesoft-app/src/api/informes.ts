import api from './axios'

export interface InformeDisponible { codigo: string; nombre: string; descripcion: string; usaLiquidacion: boolean; usaFechas: boolean; usaAgrupar: boolean; usaLegajo: boolean }
export interface ColumnaInforme { nombre: string; tipo: 'texto' | 'numero' | 'dinero' }
export interface FilaInforme { celdas: (string | number | null)[]; clase: '' | 'subtotal' | 'total' }
export interface TablaInforme { codigo: string; titulo: string; subtitulo: string; columnas: ColumnaInforme[]; filas: FilaInforme[] }
export interface ParamsInforme { idLiquidacion?: number; desde?: string; hasta?: string; agrupar?: string; legajo?: string }

export const AGRUPACIONES: { valor: string; label: string }[] = [
  { valor: 'centro_costo', label: 'Centro de costo' }, { valor: 'convenio', label: 'Convenio' }, { valor: 'categoria', label: 'Categoría' },
  { valor: 'obra_social', label: 'Obra social' }, { valor: 'sucursal', label: 'Sucursal' },
]

export const getInformes = () => api.get<InformeDisponible[]>('/sueldos/informes').then((r) => r.data)

const limpiar = (p: ParamsInforme) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))

export const getInforme = (codigo: string, p: ParamsInforme) =>
  api.get<TablaInforme>(`/sueldos/informes/${codigo}`, { params: limpiar(p) }).then((r) => r.data)

/** Baja el archivo con el token y lo guarda (PDF se abre en otra pestaña, Excel se descarga). */
export async function bajarInforme(codigo: string, p: ParamsInforme, formato: 'pdf' | 'xlsx') {
  const r = await api.get(`/sueldos/informes/${codigo}`, { params: { ...limpiar(p), formato }, responseType: 'blob' })
  guardarBlob(r.data, formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `${codigo}.${formato}`, formato === 'pdf')
}

/** Libro de Sueldos (art. 52) de una liquidación, en PDF. */
export async function abrirLibroSueldos(idLiquidacion: number) {
  const r = await api.get(`/sueldos/informes/libro-sueldos/${idLiquidacion}`, { responseType: 'blob' })
  guardarBlob(r.data, 'application/pdf', `libro_sueldos_${idLiquidacion}.pdf`, true)
}

export function guardarBlob(data: BlobPart, tipo: string, nombre: string, abrir: boolean) {
  const url = URL.createObjectURL(new Blob([data], { type: tipo }))
  if (abrir) window.open(url, '_blank')
  else { const a = document.createElement('a'); a.href = url; a.download = nombre; a.click() }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Un error de una descarga llega como blob: se lee el mensaje que mandó la API. */
export async function mensajeDeBlob(e: unknown): Promise<string> {
  const data = (e as { response?: { data?: unknown } })?.response?.data
  if (data instanceof Blob) { try { return JSON.parse(await data.text()).error ?? 'No se pudo generar el informe.' } catch { /* sigue */ } }
  return 'No se pudo generar el informe.'
}
