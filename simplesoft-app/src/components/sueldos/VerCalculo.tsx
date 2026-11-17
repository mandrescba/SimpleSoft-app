import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, Lightbulb, XCircle } from 'lucide-react'
import { getCalculoConcepto } from '../../api/liquidaciones'
import { mensajeDeError } from '../../api/axios'
import { formatoDinero, formatoNumero } from '../../lib/formato'
import Modal from '../ui/Modal'

/**
 * «Ver cálculo» de un renglón del recibo: las fórmulas del concepto, el valor de cada variable que usan en este recibo y,
 * si dio error o una variable que divide vale 0, qué pasó y dónde se arregla.
 */
export default function VerCalculo({ idLiquidacion, idRecibo, idEmpleado, codigo, importeGuardado, onClose }: {
  idLiquidacion: number; idRecibo: number; idEmpleado: number; codigo: string; importeGuardado: number; onClose: () => void
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sueldos', 'calculo', idLiquidacion, idRecibo, codigo],
    queryFn: () => getCalculoConcepto(idLiquidacion, idRecibo, codigo),
    staleTime: 0,
  })
  const conCausa = data?.variables.filter((v) => v.causa) ?? []
  // si el recibo se liquidó con otros datos, lo que se ve acá (datos de hoy) puede no coincidir con lo guardado
  const distinto = data && Math.abs(data.importe - importeGuardado) > 0.005

  return (
    <Modal titulo={data ? `Cálculo del concepto ${data.codigo}: ${data.descripcion}` : `Cálculo del concepto ${codigo}`} onClose={onClose} ancho="max-w-2xl">
      {isLoading && <p className="text-sm text-gray-500">Calculando…</p>}
      {isError && <p className="text-sm text-red-600">{mensajeDeError(error, 'No se pudo explicar el cálculo.')}</p>}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Dato titulo="Cantidad" valor={data.unidad ? formatoNumero(data.unidad) : '—'} />
            <Dato titulo="Valor unidad" valor={data.unitario !== null ? formatoDinero(data.unitario) : '—'} />
            <Dato titulo="Importe" valor={formatoDinero(data.importe)} destacado />
          </div>

          {data.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex gap-2">
              <XCircle size={18} className="shrink-0 mt-0.5" />
              <div><span className="font-medium">La fórmula dio error:</span> {data.mensaje}</div>
            </div>
          )}
          {!data.error && !data.aplica && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 flex gap-2">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" /> El concepto no aplica en este recibo: su condición dio falso.
            </div>
          )}
          {conCausa.map((v) => (
            <div key={v.nombre} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-2">
              <Lightbulb size={18} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-mono text-xs font-semibold">{v.nombre}</span> vale 0 y la fórmula divide por ese valor. {v.causa}{' '}
                <Link to={`/sueldos/empleados/${idEmpleado}`} className="underline font-medium whitespace-nowrap" onClick={onClose}>Ir a la ficha del empleado</Link>
              </div>
            </div>
          ))}

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Fórmulas</h3>
            {data.formulas.length === 0
              ? <p className="text-sm text-gray-500">Este concepto no tiene fórmulas: el importe se carga a mano.</p>
              : (
                <dl className="space-y-2">
                  {data.formulas.map((f) => (
                    <div key={f.parte}>
                      <dt className="text-xs text-gray-500">{f.parte === 'Importe' ? 'Fórmula de Importe' : f.parte}</dt>
                      <dd className="font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">{f.texto}</dd>
                    </div>
                  ))}
                </dl>
              )}
          </section>

          {data.conceptos.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Conceptos que usa</h3>
              <p className="text-xs text-gray-500 mb-2"><span className="font-mono">#10</span> es el importe del concepto de código 10; <span className="font-mono">@10</span> es su cantidad.</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 bg-gray-50"><th className="px-3 py-2 font-medium">En la fórmula</th><th className="px-3 py-2 font-medium">Código</th><th className="px-3 py-2 font-medium">Concepto</th><th className="px-3 py-2 font-medium text-right">{'Valor en este recibo'}</th></tr></thead>
                  <tbody>
                    {data.conceptos.map((c) => (
                      <tr key={c.referencia} className="border-t border-gray-100">
                        <td className="px-3 py-1.5 font-mono text-xs">{c.referencia}</td>
                        <td className="px-3 py-1.5 font-mono text-xs">{c.codigo}</td>
                        <td className="px-3 py-1.5 text-gray-600">{c.descripcion}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{c.valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data.variables.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Valores que usa en este recibo</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 bg-gray-50"><th className="px-3 py-2 font-medium">Variable</th><th className="px-3 py-2 font-medium">Qué es</th><th className="px-3 py-2 font-medium text-right">Valor</th></tr></thead>
                  <tbody>
                    {data.variables.map((v) => (
                      <tr key={v.nombre} className={`border-t border-gray-100 ${v.causa ? 'bg-amber-50' : ''}`}>
                        <td className="px-3 py-1.5 font-mono text-xs">{v.nombre}</td>
                        <td className="px-3 py-1.5 text-gray-600">{v.descripcion ?? ''}</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${v.causa ? 'font-semibold text-amber-800' : ''}`}>{v.valor ?? 'no definida'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="text-xs text-gray-400">
            Calculado ahora con los datos actuales del empleado, sin modificar el recibo.
            {distinto && ` El recibo guardado tiene otro importe (${formatoDinero(importeGuardado)}): los datos cambiaron después de liquidarlo, volvé a calcularlo.`}
          </p>
        </div>
      )}
    </Modal>
  )
}

function Dato({ titulo, valor, destacado }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${destacado ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <div className="text-xs text-gray-500">{titulo}</div>
      <div className={`tabular-nums ${destacado ? 'font-semibold text-blue-800' : 'text-gray-800'}`}>{valor}</div>
    </div>
  )
}
