import { RotateCcw, Settings } from 'lucide-react'
import { DENSIDAD_POR_DEFECTO, OPCIONES_PAGINADO, PAGINADO_POR_DEFECTO, useConfigStore, type Densidad } from '../../store/configStore'
import { PX_POR_DENSIDAD, densidadEfectiva } from '../../lib/densidad'

const NIVELES: { valor: Densidad; titulo: string; detalle: string }[] = [
  { valor: 'auto', titulo: 'Automática', detalle: 'Se ajusta sola según la pantalla' },
  { valor: 'normal', titulo: 'Normal', detalle: 'Tamaño estándar (100 %)' },
  { valor: 'compacta', titulo: 'Compacta', detalle: 'Un poco más chica (88 %)' },
  { valor: 'muy-compacta', titulo: 'Muy compacta', detalle: 'Para pantallas muy chicas (78 %)' },
]

function Opciones({ children, etiqueta }: { children: React.ReactNode; etiqueta: string }) {
  return <div className="mt-4 flex flex-wrap items-stretch gap-2" role="radiogroup" aria-label={etiqueta}>{children}</div>
}

/** Preferencias de uso de este navegador: filas por página de las grillas y tamaño de la pantalla. */
export default function ConfiguracionPage() {
  const pageSize = useConfigStore((s) => s.pageSize)
  const densidad = useConfigStore((s) => s.densidad)
  const setPageSize = useConfigStore((s) => s.setPageSize)
  const setDensidad = useConfigStore((s) => s.setDensidad)
  const restablecer = useConfigStore((s) => s.restablecer)

  const anchoPantalla = window.screen.width || window.innerWidth
  const efectiva = densidadEfectiva(densidad, anchoPantalla)
  const porDefecto = pageSize === PAGINADO_POR_DEFECTO && densidad === DENSIDAD_POR_DEFECTO

  return (
    <div className="max-w-3xl space-y-5">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Settings size={20} className="text-blue-700" /></div>
        <div className="mr-auto">
          <h1 className="text-xl font-bold text-gray-800">Configuración</h1>
          <p className="text-sm text-gray-500 mt-0.5">Preferencias de uso. Se guardan en este navegador y no cambian lo que ven los demás usuarios.</p>
        </div>
        <button onClick={restablecer} disabled={porDefecto}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent">
          <RotateCcw size={14} /> Restablecer todo
        </button>
      </header>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800">Filas por página en las grillas</h2>
        <p className="text-sm text-gray-500 mt-1">Cuántos registros se muestran de una vez en los listados. Vale para todas las pantallas con paginado.</p>
        <Opciones etiqueta="Filas por página">
          {OPCIONES_PAGINADO.map((n) => (
            <button key={n} role="radio" aria-checked={pageSize === n} onClick={() => setPageSize(n)}
              className={`min-w-[64px] px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${pageSize === n ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
              {n}
            </button>
          ))}
        </Opciones>
        <p className="mt-3 text-xs text-gray-400">Valor inicial: {PAGINADO_POR_DEFECTO}.</p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800">Tamaño de la pantalla</h2>
        <p className="text-sm text-gray-500 mt-1">Achica o agranda menús, tablas y ventanas. En monitores chicos (por ejemplo de 1366 × 768) la opción compacta hace entrar más columnas sin desplazarse.</p>
        <Opciones etiqueta="Tamaño de la pantalla">
          {NIVELES.map((n) => (
            <button key={n.valor} role="radio" aria-checked={densidad === n.valor} onClick={() => setDensidad(n.valor)}
              className={`text-left px-4 py-2.5 rounded-lg border transition-colors ${densidad === n.valor ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
              <span className="block text-sm font-medium">{n.titulo}</span>
              <span className={`block text-xs ${densidad === n.valor ? 'text-blue-100' : 'text-gray-400'}`}>{n.detalle}</span>
            </button>
          ))}
        </Opciones>
        <p className="mt-3 text-xs text-gray-400">
          Esta pantalla mide {anchoPantalla} px de ancho. Ahora se está usando el tamaño <b>{efectiva === 'muy-compacta' ? 'muy compacta' : efectiva}</b> ({PX_POR_DENSIDAD[efectiva]} px de letra base).
        </p>
      </section>
    </div>
  )
}
