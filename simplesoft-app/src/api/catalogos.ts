import api from './axios'

/** Un valor de un catálogo simple. */
export interface ItemCatalogo { codigo: string; descripcion: string; detalle: string | null; orden: number; activo: boolean }

/** Tipo de empresa. Las banderas dicen cómo se comporta. */
export interface TipoEmpresaItem extends ItemCatalogo {
  accesoClientes: boolean      // los usuarios que no son superadministrador la ven y pueden entrar
  cuentaComoCliente: boolean   // cuenta en las estadísticas y la cobranza
  altaPermitida: boolean       // se puede elegir al crear una empresa
  bajaPermitida: boolean
  marcaAgua: boolean           // sus PDF salen con la marca PRUEBA
}

export interface TipoLiquidacionItem extends ItemCatalogo {
  usaSemestre: boolean         // lleva semestre 1 o 2 (el aguinaldo)
  bloqueaNovedades: boolean
  comodin: boolean             // TODAS: sirve para asignar conceptos, no para crear una liquidación
}

export interface ModuloItem extends ItemCatalogo {
  contratable: boolean         // se puede contratar por empresa (el módulo Sistema no)
}

export interface ModalidadLiquidacionItem extends ItemCatalogo {
  esJornal: boolean            // se paga por jornal (día u hora)
}

export interface ColumnaConceptoItem extends ItemCatalogo {
  tituloGrupo: string          // título con el que se agrupan los renglones
  posicionRecibo: number | null // columna del recibo impreso (1, 2 o 3); null = no se imprime
  imprimeEnCero: boolean
  calculoInterno: boolean      // auxiliar: no se agrega a mano a un recibo y se oculta por defecto
}

/** Rubro del recibo con el formato del Decreto 407/2026 (sindical, seguridad social, obra social, INSSJP, ART, seguro de vida, otros). */
export interface RubroReciboItem extends ItemCatalogo {
  enTorta: boolean             // tiene su propia porción en el gráfico del costo total del empleador
  color: string                // color de esa porción (#RRGGBB)
}

export interface Catalogos {
  tiposEmpresa: TipoEmpresaItem[]
  tiposLiquidacion: TipoLiquidacionItem[]
  estadosLiquidacion: ItemCatalogo[]
  modulos: ModuloItem[]
  condicionesIva: ItemCatalogo[]
  tiposEmpleador: ItemCatalogo[]
  modalidadesLiquidacion: ModalidadLiquidacionItem[]
  parentescos: ItemCatalogo[]
  columnasConcepto: ColumnaConceptoItem[]
  rubrosRecibo: RubroReciboItem[]
  // catálogos de ARCA del empleado y del recibo (cada uno en su tabla SP_SLD_AFIP_*)
  afipModalidades: ItemCatalogo[]
  afipSituaciones: ItemCatalogo[]
  afipCondiciones: ItemCatalogo[]
  afipIncapacidades: ItemCatalogo[]
  afipZonas: ItemCatalogo[]
  afipActividades: ItemCatalogo[]
}

/** Todos los catálogos de los desplegables, con los inactivos incluidos (para mostrar lo ya guardado). */
export const getCatalogos = () => api.get<Catalogos>('/sistema/catalogos').then((r) => r.data)
