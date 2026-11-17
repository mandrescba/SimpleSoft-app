import { useQuery } from '@tanstack/react-query'
import { getCatalogos, type Catalogos, type ItemCatalogo } from '../api/catalogos'

const vacio: Catalogos = { tiposEmpresa: [], tiposLiquidacion: [], estadosLiquidacion: [], modulos: [], condicionesIva: [], tiposEmpleador: [], modalidadesLiquidacion: [], parentescos: [], columnasConcepto: [], rubrosRecibo: [], afipModalidades: [], afipSituaciones: [], afipCondiciones: [], afipIncapacidades: [], afipZonas: [], afipActividades: [] }

/** Nombre de un valor del catálogo; si todavía no cargó o no existe, el propio código. */
export const nombreDe = (lista: ItemCatalogo[], codigo: string | null | undefined) => (codigo ? lista.find((x) => x.codigo === codigo)?.descripcion ?? codigo : '')

/** Solo los valores activos, para armar un desplegable. */
export const activos = <T extends ItemCatalogo>(lista: T[]) => lista.filter((x) => x.activo)

/**
 * Los catálogos de los desplegables (tipo de empresa, tipo y estado de liquidación, módulos, condición IVA, tipo de empleador,
 * modalidad de liquidación del empleado y parentesco).
 * Se piden una vez y se reutilizan; mientras llegan, las listas están vacías.
 */
export function useCatalogos() {
  const { data } = useQuery({ queryKey: ['sistema', 'catalogos'], queryFn: getCatalogos, staleTime: 5 * 60_000 })
  const c = data ?? vacio
  return {
    ...c,
    cargado: !!data,
    tipoEmpresa: (codigo: string) => c.tiposEmpresa.find((t) => t.codigo === codigo),
    tipoLiquidacion: (codigo: string) => c.tiposLiquidacion.find((t) => t.codigo === codigo),
    /** Nombre del tipo de liquidación; el aguinaldo lleva su semestre: "Aguinaldo (SAC) · 1º semestre". */
    nombreTipoLiquidacion: (codigo: string, semestre?: number | null) => {
      const t = c.tiposLiquidacion.find((x) => x.codigo === codigo)
      return `${t?.descripcion ?? codigo}${t?.usaSemestre && semestre ? ` · ${semestre}º semestre` : ''}`
    },
    nombreModulo: (codigo: string) => nombreDe(c.modulos, codigo),
    nombreCondicionIva: (codigo: string | null) => nombreDe(c.condicionesIva, codigo),
    nombreTipoEmpleador: (codigo: string | null) => nombreDe(c.tiposEmpleador, codigo),
    nombreEstado: (codigo: string) => nombreDe(c.estadosLiquidacion, codigo),
    nombreModalidad: (codigo: string | null) => nombreDe(c.modalidadesLiquidacion, codigo),
    nombreParentesco: (codigo: string | null) => nombreDe(c.parentescos, codigo),
    columnaConcepto: (codigo: string) => c.columnasConcepto.find((x) => x.codigo === codigo),
    nombreColumnaConcepto: (codigo: string | null) => nombreDe(c.columnasConcepto, codigo),
    nombreRubroRecibo: (codigo: string | null) => nombreDe(c.rubrosRecibo, codigo),
    nombreAfipModalidad: (codigo: string | null) => nombreDe(c.afipModalidades, codigo),
    /** Los renglones de esa columna son cálculos internos (auxiliares). */
    esCalculoInterno: (codigo: string) => !!c.columnasConcepto.find((x) => x.codigo === codigo)?.calculoInterno,
    /** Solapa del recibo donde van los renglones de esa columna: los que se imprimen, las contribuciones o los auxiliares. */
    solapaDeColumna: (codigo: string): 'conceptos' | 'contribuciones' | 'auxiliares' => {
      const x = c.columnasConcepto.find((k) => k.codigo === codigo)
      return x?.calculoInterno ? 'auxiliares' : x?.posicionRecibo ? 'conceptos' : 'contribuciones'
    },
  }
}
