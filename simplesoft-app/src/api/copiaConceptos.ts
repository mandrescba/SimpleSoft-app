import api from './axios'

export interface DestinoCopia { idEmpresa: number; codigo: string; razonSocial: string; puedeCrear: boolean }
export type AccionCopia = 'Crear' | 'Actualizar' | 'SinCambios' | 'Omitir'
export interface ItemCopia { tipo: 'CONCEPTO' | 'AUXILIAR' | 'TABLA' | 'TIPO_NOVEDAD'; codigo: string; descripcion: string; accion: AccionCopia; resultado: string | null }
export interface PlanCopia { idEmpresaDestino: number; items: ItemCopia[]; avisos: string[] }
export interface CopiaDestino { idEmpresa: number; empresa: string; plan: PlanCopia | null; error: string | null }
export interface PedidoCopia { codigos: string[]; destinos: number[]; incluirDependencias: boolean }

export const getDestinosCopia = () => api.get<DestinoCopia[]>('/sueldos/copia-conceptos/destinos').then((r) => r.data)
export const vistaCopia = (p: PedidoCopia) => api.post<CopiaDestino[]>('/sueldos/copia-conceptos/vista', p).then((r) => r.data)
export const copiarConceptos = (p: PedidoCopia) => api.post<CopiaDestino[]>('/sueldos/copia-conceptos/copiar', p).then((r) => r.data)
