import api from './axios'
import type { LoginRequest, SesionResponse } from '../types/auth'

export const login = (data: LoginRequest) => api.post<SesionResponse>('/auth/login', data).then((r) => r.data)

export const seleccionarEmpresa = (idEmpresa: number) =>
  api.post<SesionResponse>('/auth/seleccionar-empresa', { idEmpresa }).then((r) => r.data)

export const cambiarClave = (claveActual: string, claveNueva: string) =>
  api.post<SesionResponse>('/auth/cambiar-clave', { claveActual, claveNueva }).then((r) => r.data)
