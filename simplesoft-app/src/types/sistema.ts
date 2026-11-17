export interface UsuarioDeEmpresa {
  idUsuario: number
  usuario: string
  nombre: string
  email: string | null
  activo: boolean
  esSuperadmin: boolean
  debeCambiarClave: boolean
  ultimoAcceso: string | null
  bloqueadoHasta: string | null
  idRol: number
  rol: string
  rolEsAdministrador: boolean
  rolRango: number
  /** Código del rol de sistema (SUPERADMIN, ADMIN_EMPRESA, CONTADOR, CONSULTA...). */
  rolSistema: string
  /** Nombre del rol de sistema, tal como figura en el catálogo. */
  rolSistemaDescripcion: string
  /** Límite propio de bases; null = el del rol de sistema. */
  maxBases: number | null
  /** Celular de contacto (el email está en `email`). */
  celular: string | null
  /** Empresas que creó (activas) y su límite efectivo (null = sin límite). */
  basesCreadas: number
  limiteBases: number | null
  /** Las empresas en las que trabaja: el superadministrador ve todas, los demás las que comparten con el usuario. */
  empresas: EmpresaDelUsuario[]
}

/** Un usuario visto desde todo el sistema (lo ve el superadministrador): contacto, rol de sistema, empresas creadas frente a su límite y todas sus empresas. */
export interface CuentaUsuario {
  idUsuario: number; usuario: string; nombre: string; email: string | null; celular: string | null
  activo: boolean; esSuperadmin: boolean; debeCambiarClave: boolean; ultimoAcceso: string | null; bloqueadoHasta: string | null
  rolSistema: string; rolSistemaDescripcion: string; maxBases: number | null; basesCreadas: number; limiteBases: number | null
  empresas: EmpresaDelUsuario[]
}

export interface EmpresaDelUsuario { idEmpresa: number; codigo: string; razonSocial: string; tipo: string; rol: string; creada: boolean }

export interface Rol {
  idRol: number
  nombre: string
  descripcion: string | null
  /** 1 consulta, 2 contador, 3 administrador: nadie da un rol de rango mayor al suyo. */
  rango: number
  esAdministrador: boolean
}

/** Rol de sistema: qué puede hacer el usuario en general (crear bases, cuántas), además del rol que tenga en cada base. */
export interface RolSistema {
  codigo: string
  descripcion: string
  detalle: string | null
  esSuperadmin: boolean
  puedeCrearBases: boolean
  limiteBases: number | null
  asignablePorAdmin: boolean
}

/** Lo que el usuario puede hacer con las bases: crear, hasta cuántas (null = sin tope) y cuántas creó. */
export interface MiCuenta {
  rolSistema: string
  descripcion: string
  esSuperadmin: boolean
  puedeCrearBases: boolean
  limiteBases: number | null
  basesCreadas: number
}

/** La clave temporal se muestra una sola vez: el backend no la guarda en claro. */
export interface ClaveTemporal {
  idUsuario: number
  usuario: string
  claveTemporal: string
}

export interface EmpresaDetalle {
  idEmpresa: number
  codigo: string
  razonSocial: string
  nombreFantasia: string | null
  cuit: string | null
  condicionIva: string | null
  actividad: string | null
  domicilio: string | null
  localidad: string | null
  provincia: string | null
  codigoPostal: string | null
  telefono: string | null
  email: string | null
  activo: boolean
  ingresosBrutos: string | null
  tipoEmpleador: string | null
  codigoZona: string | null
  /** CLIENTE (producción), PRUEBA (base de prueba de un cliente), MASTER (plantilla que se copia a las empresas nuevas) o DEMO (práctica y demostración). */
  tipo: string
}
