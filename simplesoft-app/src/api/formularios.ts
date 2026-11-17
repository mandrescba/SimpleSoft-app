import api from './axios'
import { guardarBlob } from './informes'
import type { VariableExportacion } from './exportadores'

export type TipoParametro = 'TEXTO' | 'RECTANGULO' | 'LINEA' | 'IMAGEN' | 'CONCEPTOS'
export type Alineacion = 'IZQUIERDA' | 'CENTRO' | 'DERECHA'

export interface ParametroFormulario {
  nombre: string; tipo: TipoParametro; texto: string | null; posX: number; posY: number; ancho: number; alto: number; fuente: string | null; tamano: number
  negrita: boolean; cursiva: boolean; alineacion: Alineacion; colorTexto: string; colorFondo: string | null; borde: boolean; espesor: number; arco: number; imprimir: boolean
}
export interface FormularioForm {
  codigo: string; descripcion: string; orientacion: 'VERTICAL' | 'HORIZONTAL'; tamanoPagina: 'A4' | 'A5' | 'CARTA' | 'OFICIO'
  margenIzquierdo: number; margenSuperior: number; margenDerecho: number; margenInferior: number; columnas: number; filas: number
  idFormularioHermano: number | null; formulaArchivo: string | null; activo: boolean; parametros: ParametroFormulario[]
}
export interface FormularioDetalle extends FormularioForm { idFormulario: number; predeterminado: boolean }
export interface FormularioResumen { idFormulario: number; codigo: string; descripcion: string; tamanoPagina: string; orientacion: string; columnas: number; filas: number; predeterminado: boolean; activo: boolean; parametros: number }

/** Tamaño de la hoja en milímetros (ya girada si es horizontal). */
export function hojaMm(f: Pick<FormularioForm, 'tamanoPagina' | 'orientacion'>): [number, number] {
  const [w, h] = { A4: [210, 297], A5: [148, 210], CARTA: [215.9, 279.4], OFICIO: [215.9, 355.6] }[f.tamanoPagina] as [number, number]
  return f.orientacion === 'HORIZONTAL' ? [h, w] : [w, h]
}

export const getFormularios = () => api.get<FormularioResumen[]>('/sueldos/formularios').then((r) => r.data)
export const getFormulario = (id: number) => api.get<FormularioDetalle>(`/sueldos/formularios/${id}`).then((r) => r.data)
export const getVariablesRecibo = () => api.get<VariableExportacion[]>('/sueldos/formularios/variables').then((r) => r.data)
export const crearFormulario = (d: FormularioForm) => api.post<FormularioDetalle>('/sueldos/formularios', d).then((r) => r.data)
export const crearFormularioEstandar = (codigo: string, descripcion?: string) => api.post<FormularioDetalle>('/sueldos/formularios/estandar', { codigo, descripcion }).then((r) => r.data)
export const duplicarFormulario = (id: number, codigo: string, descripcion?: string) => api.post<FormularioDetalle>(`/sueldos/formularios/${id}/duplicar`, { codigo, descripcion }).then((r) => r.data)
export const modificarFormulario = (id: number, d: FormularioForm) => api.put(`/sueldos/formularios/${id}`, d).then((r) => r.data)
export const marcarPredeterminado = (id: number, valor: boolean) => api.put(`/sueldos/formularios/${id}/predeterminado`, { valor }).then((r) => r.data)
export const eliminarFormulario = (id: number) => api.delete(`/sueldos/formularios/${id}`).then((r) => r.data)

/** Abre el PDF de prueba del diseño guardado (con un recibo de muestra). Si falla el error llega como blob: se lee con <c>mensajeDeBlob</c>. */
export async function abrirVistaPrevia(id: number, idRecibo?: number): Promise<void> {
  const r = await api.get(`/sueldos/formularios/${id}/vista-previa`, { params: { idRecibo }, responseType: 'blob' })
  guardarBlob(r.data, 'application/pdf', 'vista_previa.pdf', true)
}

export const getImagenes = () => api.get<string[]>('/sueldos/formularios/imagenes').then((r) => r.data)
export const eliminarImagen = (nombre: string) => api.delete(`/sueldos/formularios/imagenes/${encodeURIComponent(nombre)}`).then((r) => r.data)
export function subirImagen(nombre: string, archivo: File) {
  const f = new FormData()
  f.append('archivo', archivo)
  return api.put(`/sueldos/formularios/imagenes/${encodeURIComponent(nombre)}`, f).then((r) => r.data)
}
export async function verImagen(nombre: string): Promise<void> {
  const r = await api.get(`/sueldos/formularios/imagenes/${encodeURIComponent(nombre)}`, { responseType: 'blob' })
  guardarBlob(r.data, (r.headers['content-type'] as string | undefined) ?? 'image/png', `${nombre}.png`, true)
}
