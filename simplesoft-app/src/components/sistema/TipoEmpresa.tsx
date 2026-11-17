import { useState } from 'react'
import { ChevronDown, ChevronRight, FlaskConical, LayoutTemplate, TriangleAlert } from 'lucide-react'
import { useCatalogos } from '../../hooks/useCatalogos'

/** Código del tipo de empresa (CLIENTE, PRUEBA, MASTER, DEMO...): los valores salen del catálogo. */
export type TipoEmpresaCodigo = string

/** Colores del nombre de cada tipo de empresa (el nombre y la descripción salen del catálogo de tipos de empresa). */
const ESTILO_TIPO: Record<string, string> = { CLIENTE: 'text-green-700', PRUEBA: 'text-yellow-800', MASTER: 'text-purple-700', DEMO: 'text-amber-700' }
export const estiloEntorno = (tipo: string) => ESTILO_TIPO[tipo] ?? 'text-gray-700'

/** Etiqueta de una empresa que no es de producción (prueba, plantilla o demo), con el nombre del catálogo. Para un cliente en producción no muestra nada. */
export function EtiquetaTipo({ tipo }: { tipo: TipoEmpresaCodigo }) {
  const { tipoEmpresa } = useCatalogos()
  if (tipo === 'CLIENTE') return null
  const t = tipoEmpresa(tipo)
  const nombre = t?.descripcion ?? tipo
  const estilo = tipo === 'MASTER' ? 'bg-purple-100 text-purple-700' : tipo === 'PRUEBA' ? 'bg-yellow-100 text-yellow-800' : tipo === 'DEMO' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
  const Icono = tipo === 'MASTER' ? LayoutTemplate : tipo === 'DEMO' ? FlaskConical : TriangleAlert
  return <span title={t?.detalle ?? undefined} className={`ml-2 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${estilo}`}><Icono size={10} /> {nombre}</span>
}

/** Explica qué es cada tipo de empresa. Viene plegada (se recuerda si la abrís) para no ocupar la pantalla. */
export function GuiaEmpresas() {
  const [abierta, setAbierta] = useState(() => { try { return localStorage.getItem('guia-empresas') === '1' } catch { return false } })
  const alternar = () => setAbierta((a) => { try { localStorage.setItem('guia-empresas', a ? '0' : '1') } catch { /* sin almacenamiento: no se recuerda */ } return !a })
  if (!abierta)
    return (
      <button type="button" onClick={alternar} className="mb-3 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"><ChevronRight size={14} /> ¿Cómo se organizan las empresas? (MASTER, DEMO, clientes y pruebas)</button>
    )
  return (
    <div className="mb-4 bg-white border border-gray-200 rounded-xl p-4 text-sm">
      <button type="button" onClick={alternar} className="font-semibold text-gray-800 mb-2 inline-flex items-center gap-1"><ChevronDown size={16} /> Cómo se organizan las empresas</button>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <div className="font-medium text-purple-700 flex items-center gap-1.5"><LayoutTemplate size={14} /> MASTER · Plantilla</div>
          <p className="text-gray-600 mt-1">Guarda la configuración base de Sueldos: conceptos y fórmulas, grupos, tablas, convenios, tipos de novedad e informes. No tiene empleados ni liquidaciones. Cada empresa nueva arranca con una <strong>copia</strong> de esta configuración. Si cambia algo para todos, se cambia acá.</p>
        </div>
        <div>
          <div className="font-medium text-amber-700 flex items-center gap-1.5"><FlaskConical size={14} /> DEMO · Práctica</div>
          <p className="text-gray-600 mt-1">Empresa de ejemplo con empleados cargados, para probar, hacer demostraciones y dar de alta empleados, novedades y liquidaciones sin afectar a ningún cliente.</p>
        </div>
        <div>
          <div className="font-medium text-blue-700">Clientes</div>
          <p className="text-gray-600 mt-1">Las empresas reales. Cada una tiene sus propios datos y su copia de la configuración, que puede ajustar sin tocar a las demás. Son las que cuentan en las estadísticas de Clientes.</p>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-3"><strong className="text-yellow-800">Base de prueba:</strong> una empresa de un cliente para probar antes de liquidar de verdad. La usan los usuarios del cliente, no cuenta como cliente en las estadísticas, la franja amarilla avisa en todas las pantallas y sus PDF salen con la marca de agua PRUEBA. Cuando está lista se pasa a producción, con la opción de borrar los empleados, novedades y liquidaciones de prueba.</p>
      <p className="text-xs text-gray-500 mt-2">MASTER y DEMO las ven todos los usuarios: la MASTER en <strong>solo lectura</strong> (es lo que se copia a las empresas nuevas) y la DEMO para <strong>probar</strong>. Solo el administrador del sistema modifica su configuración.</p>
    </div>
  )
}

/** Franja de aviso arriba de todas las pantallas cuando se trabaja en una empresa que no es de producción. No muestra nada para un cliente real. */
export function BandaEmpresa({ tipo }: { tipo: TipoEmpresaCodigo | undefined }) {
  const textos: Record<string, { cls: string; texto: string }> = {
    PRUEBA: { cls: 'bg-yellow-100 text-yellow-900 border-yellow-300', texto: 'EMPRESA DE PRUEBA: los datos no son reales. Los recibos e informes salen con la marca PRUEBA. Cuando termines de probar, pasala a producción desde Empresas.' },
    DEMO: { cls: 'bg-amber-100 text-amber-900 border-amber-300', texto: 'EMPRESA DEMO: entorno de práctica y demostración. No es de ningún cliente.' },
    MASTER: { cls: 'bg-purple-100 text-purple-900 border-purple-300', texto: 'PLANTILLA MASTER: lo que cambies acá se copia a las empresas que se creen de ahora en más.' },
  }
  const t = tipo ? textos[tipo] : undefined
  if (!t) return null
  return <div role="status" className={`flex items-center gap-2 border-b px-4 py-2 text-sm font-medium ${t.cls}`}><TriangleAlert size={16} className="shrink-0" />{t.texto}</div>
}
