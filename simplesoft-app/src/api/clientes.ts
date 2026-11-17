import api from './axios'
import type { EmpresaDetalle } from '../types/sistema'

export interface Actividad { idActividad: number; codigo: string | null; descripcion: string }
export interface ActividadEmpresa extends Actividad { principal: boolean }
export interface Contacto { nombre: string; rol: string | null; telefono: string | null; email: string | null; principal: boolean }
export interface ModuloEmpresa { modulo: string; habilitado: boolean; desde: string | null; hasta: string | null }
export interface EmpleadosPorConvenio { convenio: string; cantidad: number }

/** Una empresa cliente con su ficha comercial. */
export interface ClienteFicha {
  empresa: EmpresaDetalle
  fechaAlta: string
  actividades: ActividadEmpresa[]
  contactos: Contacto[]
  modulos: ModuloEmpresa[]
  empleadosActivos: number
  porConvenio: EmpleadosPorConvenio[]
}

export interface FichaComercial { actividades: number[]; actividadPrincipal: number | null; contactos: Contacto[]; modulos: ModuloEmpresa[] }

export const getClientes = () => api.get<ClienteFicha[]>('/sistema/clientes').then((r) => r.data)
export const guardarFicha = (idEmpresa: number, f: FichaComercial) => api.put(`/sistema/clientes/${idEmpresa}/ficha`, f).then((r) => r.data)
export const guardarActividades = (idEmpresa: number, actividades: number[], actividadPrincipal: number | null) =>
  api.put(`/sistema/empresas/${idEmpresa}/actividades`, { actividades, actividadPrincipal }).then((r) => r.data)
/** Las actividades de una empresa (la principal primero); las puede ver quien las puede asignar: superadministrador, creador o administrador de la empresa. */
export const getActividadesEmpresa = (idEmpresa: number) => api.get<ActividadEmpresa[]>(`/sistema/empresas/${idEmpresa}/actividades`).then((r) => r.data)
export const buscarActividades = (q: string) => api.get<Actividad[]>('/sistema/actividades', { params: { q } }).then((r) => r.data)
export const crearActividad = (descripcion: string, codigo: string | null) => api.post<Actividad>('/sistema/actividades', { codigo, descripcion }).then((r) => r.data)
