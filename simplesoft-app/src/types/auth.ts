export interface LoginRequest {
  usuario: string
  password: string
}

/** Empresa a la que el usuario tiene acceso, con el rol que tiene en ella. */
export interface EmpresaDeUsuario {
  idEmpresa: number
  codigo: string
  razonSocial: string
  rol: string
  /** CLIENTE, PRUEBA, MASTER o DEMO. Las sesiones guardadas antes de que existiera no lo traen: se toman como CLIENTE. */
  tipo?: string
}

/** Respuesta de /api/auth/login y /api/auth/seleccionar-empresa. */
export interface SesionResponse {
  token: string
  usuario: string
  nombre: string
  esSuperadmin: boolean
  empresas: EmpresaDeUsuario[]
  /** null mientras el usuario no eligió empresa (tiene varias). */
  empresaActual: EmpresaDeUsuario | null
  /** Verdadero con clave inicial o reiniciada: hay que cambiarla antes de usar el sistema. */
  debeCambiarClave: boolean
}
