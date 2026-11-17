import api from './axios'
import { guardarBlob, type TablaInforme } from './informes'
import { nombreDe, type TablaExportador, type VariableExportacion, type ErrorFilaExportacion } from './exportadores'

export type TipoDatoInforme = 'TEXTO' | 'ENTERO' | 'DECIMAL' | 'FECHA'
export type FuncionGrupo = 'SUM' | 'COUNT' | 'MIN' | 'MAX' | 'AVG'

export interface CampoInforme {
  descripcion: string; formula: string | null; tipoDato: TipoDatoInforme; decimales: number | null; formato: string | null
  visible: boolean; agrupado: boolean; funcionGrupo: FuncionGrupo | null
}
export interface InformeForm {
  codigo: string; descripcion: string; tabla: TablaExportador; ordenamiento: string | null; condicion: string | null
  orientacion: 'VERTICAL' | 'HORIZONTAL'; orden: number; campos: CampoInforme[]
}
export interface InformeDetalle extends InformeForm { idInforme: number }
export interface InformeResumen { idInforme: number; codigo: string; descripcion: string; tabla: TablaExportador; campos: number }
export interface FiltroInforme { idLiquidacion?: number; desde?: string; hasta?: string; incluirBajas?: boolean; omitirConError?: boolean }
export interface InformeEjecutado { tabla: TablaInforme; excluidas: number; errores: ErrorFilaExportacion[] }

export const getInformesPersonalizados = () => api.get<InformeResumen[]>('/sueldos/informes-personalizados').then((r) => r.data)
export const getInformePersonalizado = (id: number) => api.get<InformeDetalle>(`/sueldos/informes-personalizados/${id}`).then((r) => r.data)
export const getVariablesInforme = (tabla: string) => api.get<VariableExportacion[]>('/sueldos/informes-personalizados/variables', { params: { tabla } }).then((r) => r.data)
export const crearInformePersonalizado = (d: InformeForm) => api.post<InformeDetalle>('/sueldos/informes-personalizados', d).then((r) => r.data)
export const modificarInformePersonalizado = (id: number, d: InformeForm) => api.put(`/sueldos/informes-personalizados/${id}`, d).then((r) => r.data)
export const eliminarInformePersonalizado = (id: number) => api.delete(`/sueldos/informes-personalizados/${id}`).then((r) => r.data)
export const ejecutarInformePersonalizado = (id: number, f: FiltroInforme) =>
  api.post<InformeEjecutado>(`/sueldos/informes-personalizados/${id}/ejecutar`, f).then((r) => r.data)

/** Genera el PDF (se abre) o el Excel (se baja). Si falla, el error llega como blob: se lee con <c>mensajeDeBlob</c>. */
export async function bajarInformePersonalizado(id: number, f: FiltroInforme, formato: 'pdf' | 'xlsx'): Promise<void> {
  const r = await api.post(`/sueldos/informes-personalizados/${id}/ejecutar`, f, { params: { formato }, responseType: 'blob' })
  const nombre = nombreDe(r.headers['content-disposition'] as string | undefined, `informe.${formato}`)
  guardarBlob(r.data, (r.headers['content-type'] as string | undefined) ?? 'application/octet-stream', nombre, formato === 'pdf')
}
