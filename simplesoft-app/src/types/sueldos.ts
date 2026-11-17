export interface LineaRecibo {
  codigo: string
  descripcion: string
  columna: string   // código de la columna (catálogo)
  unidad: number
  importe: number
  aplica: boolean
  advertencia: boolean
  error: boolean
  mensaje: string | null
}

export interface ReciboCalculado {
  legajo: string
  periodo: string
  remunerativo: number
  noRemunerativo: number
  descuento: number
  sueldoBruto: number
  sueldoNeto: number
  contribucion: number
  costoLaboral: number
  lineas: LineaRecibo[]
}

/** Todos los datos editables de un concepto, con sus fórmulas. */
export interface ConceptoDetalle {
  codigo: string
  descripcion: string
  columna: string
  codigoAfip: string | null
  /** Rubro del recibo con el formato del Decreto 407/2026 (solo aportes y contribuciones); null = sin clasificar. */
  rubroRecibo: string | null
  simboloUnidad: string | null
  decimalesUnidad: number
  unidadVisible: boolean
  decimalesImporte: number
  campoUnidadManual: boolean
  leyendaUnidad: string | null
  campoImporteManual: boolean
  leyendaImporte: string | null
  formulaUnidad: string | null
  formulaImporte: string | null
  formulaUnitario: string | null
  formulaCondicion: string | null
  activo: boolean
  orden: number
}

export interface ResultadoValidacion {
  valida: boolean
  error: string | null
  advertencias: string[]
}

export interface Concepto {
  codigo: string
  descripcion: string
  columna: string
  activo: boolean
  orden: number
}

export interface EmpleadoLista {
  idEmpleado: number
  legajo: string
  apellido: string
  nombre: string
  cuil: string | null
  tarea: string | null
  fechaIngreso: string | null
  fechaEgreso: string | null
  activo: boolean
  categoria: string | null
}

/** Ficha completa. Las fechas viajan como texto ISO; los vacíos como null. */
export interface EmpleadoDetalle {
  idEmpleado: number
  legajo: string
  apellido: string
  nombre: string
  cuil: string | null
  grupo: string | null
  estado: string | null
  tarea: string | null
  fechaIngreso: string | null
  fechaEgreso: string | null
  fechaAntiguedad: string | null
  antiguedadFija: number | null
  sexo: string | null
  fechaNacimiento: string | null
  nacionalidad: string | null
  estadoCivil: string | null
  tipoDocumento: string | null
  numeroDocumento: string | null
  domicilio: string | null
  localidad: string | null
  provincia: string | null
  codigoPostal: string | null
  telefono: string | null
  email: string | null
  idCategoria: number | null
  sueldoPactado: number | null
  adicional: number | null
  auxiliar: number | null
  dias: number | null
  horas: number | null
  porcentaje: number | null
  jornada: string | null
  proporcional: boolean
  liquidacion: string
  diasVacaciones: number | null
  idGrupoConceptos: number | null
  idSucursal: number | null
  centroCosto: string | null
  lugarTrabajo: string | null
  banco: string | null
  cuenta: string | null
  cbu: string | null
  observaciones: string | null
  activo: boolean
}

/** Datos de ARCA del empleado (cada código es el de su catálogo SP_SLD_AFIP_*); vigenciaDesde = desde cuándo rigen (al guardar y en el historial). */
export interface DatosArca {
  situacion: string | null
  condicion: string | null
  actividad: string | null
  modalidad: string | null
  incapacidad: string | null
  codigoZona: string | null
  situacionRevista1: string | null
  diaInicio1: number | null
  situacionRevista2: string | null
  diaInicio2: number | null
  situacionRevista3: string | null
  diaInicio3: number | null
  vigenciaDesde: string | null
}

export interface Familiar {
  idFamiliar: number
  parentesco: string
  apellido: string
  nombre: string
  cuil: string | null
  sexo: string | null
  fechaNacimiento: string | null
  estudio: string | null
  estudioEnCurso: boolean
  discapacidad: boolean
  adopcion: boolean
  adherente: boolean
  deducible: boolean
  porcentajeDeduccion: number | null
}

export interface Novedad {
  codigoTipo: string
  descripcion: string
  tipoDato: string
  fecha: string
  valor: string | null
}

export interface CategoriaOpcion { idCategoria: number; convenio: string; codigo: string; descripcion: string }
export interface GrupoOpcion { idGrupoConceptos: number; codigo: string; descripcion: string }
export interface TipoNovedadOpcion { idTipoNovedad: number; codigo: string; descripcion: string; tipoDato: string }

export interface CatalogosSueldos {
  categorias: CategoriaOpcion[]
  gruposConceptos: GrupoOpcion[]
  tiposNovedad: TipoNovedadOpcion[]
  sucursales: Sucursal[]
}

export interface Sucursal {
  idSucursal: number
  codigo: string
  nombre: string
  domicilio: string | null
  localidad: string | null
  provincia: string | null
  codigoPostal: string | null
  telefono: string | null
  activo: boolean
}

// ---- liquidaciones guardadas
export interface LiquidacionResumen {
  idLiquidacion: number
  periodo: string
  tipo: string
  /** CARGA (empleados y novedades), LIQUIDACION (se calculan los recibos) o CERRADA. */
  estado: 'CARGA' | 'LIQUIDACION' | 'CERRADA'
  fecha: string
  fechaDesde: string
  fechaHasta: string
  descripcion: string | null
  fechaPago: string | null
  recibos: number
  totalNeto: number
  totalCostoLaboral: number
  lugarPago: string | null
  fechaDeposito: string | null
  periodoDeposito: string | null
  bancoDeposito: string | null
  grupoEmpleados: string | null
  filtroConceptos: string | null
  /** Solo el aguinaldo (SAC): 1 o 2. */
  semestre: number | null
  fechaCierre: string | null
  usuarioCierre: string | null
}

/** Un cambio de fase de la liquidación. */
export interface HistorialLiquidacion {
  fecha: string
  estadoAnterior: string | null
  estadoNuevo: string
  usuario: string | null
  motivo: string | null
}

export interface ReciboResumen {
  idRecibo: number
  /** Número del recibo dentro de la liquidación (1 = el principal). */
  numero: number
  idEmpleado: number
  legajo: string
  apellido: string
  nombre: string
  remunerativo: number
  noRemunerativo: number
  descuento: number
  sueldoBruto: number
  sueldoNeto: number
  contribucion: number
  costoLaboral: number
  conErrores: boolean
  conAdvertencias: boolean
}

export interface LiquidacionDetalle {
  liquidacion: LiquidacionResumen
  recibos: ReciboResumen[]
}

export interface ResultadoLiquidarEmpleado {
  numero: number
  legajo: string
  nombre: string
  estado: 'OK' | 'OMITIDO' | 'ERROR'
  idRecibo: number | null
  sueldoNeto: number | null
  conErrores: boolean
  mensaje: string | null
}

export interface LiquidarResponse {
  ok: number
  omitidos: number
  errores: number
  detalle: ResultadoLiquidarEmpleado[]
}

export interface LineaGuardada {
  codigo: string
  descripcion: string
  columna: string
  unidadManual: number | null
  importeManual: number | null
  unidad: number
  importe: number
  unitario: number | null
  aplica: boolean
  advertencia: boolean
  error: boolean
  mensaje: string | null
  orden: number
  /** Rubro del concepto para el recibo con el formato del Decreto 407/2026; null = sin clasificar. */
  rubroRecibo?: string | null
  campoUnidadManual: boolean
  campoImporteManual: boolean
}

/** Una fórmula de un concepto (Unidad, Importe, Valor unitario, Condición). */
export interface FormulaConcepto { parte: string; texto: string }
/** Una variable que usa el concepto con su significado y su valor en el recibo; con causa si valía 0 y la fórmula divide por ella. */
export interface VariableConcepto { nombre: string; descripcion: string | null; valor: string | null; causa: string | null }
/** Cómo se calculó un concepto en un recibo («Ver cálculo»). */
export interface CalculoConcepto {
  codigo: string; descripcion: string; columna: string; aplica: boolean; error: boolean; mensaje: string | null
  unidad: number; importe: number; unitario: number | null; formulas: FormulaConcepto[]; variables: VariableConcepto[]
  conceptos: ConceptoUsado[]
}
/** Otro concepto que usa la fórmula (#10 = importe, @10 = cantidad) con su nombre y valor en el recibo. */
export interface ConceptoUsado { referencia: string; codigo: string; descripcion: string; valor: string }

export interface ReciboGuardado {
  idRecibo: number
  idLiquidacion: number
  periodo: string
  /** Período con el número de recibo si no es el principal: 01/2026 / 2. */
  periodoConNumero: string
  /** Modalidad de contratación (descripción del catálogo de ARCA) que tenía el empleado al liquidar; null = no tenía datos de ARCA cargados. */
  modalidad?: string | null
  numero: number
  estadoLiquidacion: string
  fechaRecibo: string
  fechaPago: string | null
  idEmpleado: number
  legajo: string
  apellido: string
  nombre: string
  cuil: string | null
  tarea: string | null
  convenio: string | null
  categoria: string | null
  sueldo: number | null
  remunerativo: number
  noRemunerativo: number
  descuento: number
  sueldoBruto: number
  sueldoNeto: number
  contribucion: number
  costoLaboral: number
  observaciones: string | null
  liquidacionFinal: string | null
  lineas: LineaGuardada[]
}

// ---- convenios
export interface ConvenioDetalle {
  idConvenio: number
  codigo: string
  descripcion: string
  liquidacion: string   // código de la modalidad (catálogo)
  diasMes: number | null
  horasMes: number | null
  horasDia: number | null
  diasVacaciones: number | null
  moneda: string
  idObraSocial: number | null
  obraSocial: string | null
  idGrupoConceptos: number | null
  orden: number
  activo: boolean
  categorias: number
}

export interface CategoriaConvenio {
  idCategoria: number
  codigo: string
  descripcion: string
  jornada: string | null
  orden: number
  sueldo: number | null
  adicional: number | null
  auxiliar: number | null
  empleados: number
}

export interface EscalaCategoria {
  vigenciaDesde: string
  vigenciaHasta: string | null
  sueldo: number
  adicional: number | null
  auxiliar: number | null
}

export interface RenglonConvenio {
  idConcepto: number
  codigo: string
  descripcion: string
  tipoLiquidacion: string
  unidad: number | null
  importe: number | null
  vigenciaDesde: string | null
  vigenciaHasta: string | null
  orden: number | null
}

export interface ObraSocialOpcion { idObraSocial: number; codigo: string; descripcion: string }
