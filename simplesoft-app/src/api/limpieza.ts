import api from './axios'

export interface TablaLimpieza { tabla: string; grupo: 'MOVIMIENTOS' | 'PERSONAL' | 'CONSERVADA'; filas: number; tieneIdentity: boolean; porEmpresa: boolean }
export interface Limpieza { tablas: TablaLimpieza[]; sql: string; avisos: string[] }
export interface Borrado { borradas: { item1: string; item2: number }[]; total: number; dadasDeBaja: string[] }
interface Pedido { empresas: number[]; incluirPersonal: boolean; confirmacion?: string; darDeBaja?: boolean }

/** Revisa la base (solo lectura) para las empresas elegidas y devuelve el SQL; no borra nada. */
export const revisarLimpieza = (p: Pedido) => api.post<Limpieza>('/sistema/limpieza/revisar', p).then((r) => r.data)
/** Borra los datos de las empresas elegidas (exige confirmacion = "BORRAR"). */
export const borrarDatos = (p: Pedido) => api.post<Borrado>('/sistema/limpieza/borrar', p).then((r) => r.data)
