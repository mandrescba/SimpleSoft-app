import { Check, Lock } from 'lucide-react'
import { activos, useCatalogos } from '../../hooks/useCatalogos'
import type { LiquidacionResumen } from '../../types/sueldos'

export type FaseLiquidacion = LiquidacionResumen['estado']

/** Colores de cada fase (el nombre y el detalle salen del catálogo de estados de liquidación). */
const ESTILO_FASE: Record<string, string> = {
  CARGA: 'bg-sky-50 text-sky-700 border-sky-200',
  LIQUIDACION: 'bg-amber-50 text-amber-700 border-amber-200',
  CERRADA: 'bg-gray-100 text-gray-600 border-gray-300',
}
const estilo = (v: string) => ESTILO_FASE[v] ?? 'bg-gray-50 text-gray-600 border-gray-200'

/** Etiqueta de colores con la fase de la liquidación. */
export function EtiquetaFase({ estado }: { estado: FaseLiquidacion }) {
  const { estadosLiquidacion } = useCatalogos()
  const f = estadosLiquidacion.find((x) => x.codigo === estado)
  return <span title={f?.detalle ?? undefined} className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2 py-0.5 ${estilo(estado)}`}>{estado === 'CERRADA' && <Lock size={11} />}{f?.descripcion ?? estado}</span>
}

/** Las fases como pasos, en el orden del catálogo: las anteriores en verde, la actual resaltada y las siguientes apagadas. */
export function PasosFase({ estado }: { estado: FaseLiquidacion }) {
  const { estadosLiquidacion } = useCatalogos()
  const fases = activos(estadosLiquidacion)
  const actual = fases.findIndex((f) => f.codigo === estado)
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Fase de la liquidación">
      {fases.map((f, i) => (
        <li key={f.codigo} className="flex items-center gap-2">
          <span title={f.detalle ?? undefined} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${i === actual ? `${estilo(f.codigo)} font-semibold ring-2 ring-offset-1 ring-current/30` : i < actual ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400'}`}>
            {i < actual ? <Check size={13} /> : i === actual && f.codigo === 'CERRADA' ? <Lock size={12} /> : <span className="text-xs tabular-nums">{i + 1}</span>}{f.descripcion}
          </span>
          {i < fases.length - 1 && <span className="text-gray-300">→</span>}
        </li>
      ))}
    </ol>
  )
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Fechas de un aguinaldo: 1º semestre de enero a junio, 2º de julio a diciembre. El pago sugerido es el último día de junio y el 18 de diciembre. */
export function fechasAguinaldo(anio: number, semestre: 1 | 2) {
  return semestre === 1
    ? { periodo: `06/${anio}`, desde: iso(anio, 1, 1), hasta: iso(anio, 6, 30), pago: iso(anio, 6, 30) }
    : { periodo: `12/${anio}`, desde: iso(anio, 7, 1), hasta: iso(anio, 12, 31), pago: iso(anio, 12, 18) }
}

/** "14/11/2026 18:30" */
export const fechaHora = (s: string | null) => (s ? new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '')
