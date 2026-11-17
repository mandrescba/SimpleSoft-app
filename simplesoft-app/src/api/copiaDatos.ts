import api from './axios'

export interface EmpleadoCopia { idEmpleado: number; legajo: string; apellido: string; nombre: string; recibos: number }
export interface CopiaDatos { probado: boolean; tablas: { tabla: string; filas: number }[]; total: number }

export const getEmpleadosCopia = (empresa: number) => api.get<EmpleadoCopia[]>('/sistema/copia-datos/empleados', { params: { empresa } }).then((r) => r.data)
/** Copia los empleados elegidos con sus liquidaciones y recibos. Con probar=true hace todo y deshace (no guarda). */
export const copiarDatos = (p: { origen: number; destino: number; empleados: number[]; probar: boolean }) =>
  api.post<CopiaDatos>('/sistema/copia-datos/copiar', p).then((r) => r.data)
