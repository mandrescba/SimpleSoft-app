import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getArca, getHistorialArca, guardarArca } from '../../api/empleados'
import { mensajeDeError } from '../../api/axios'
import { BotonPrimario, Campo, Mensaje, inputCls } from '../ui/Campos'
import { activos, nombreDe, useCatalogos } from '../../hooks/useCatalogos'
import type { ItemCatalogo } from '../../api/catalogos'
import type { DatosArca } from '../../types/sueldos'

const vacio: DatosArca = {
  situacion: null, condicion: null, actividad: null, modalidad: null, incapacidad: null, codigoZona: null,
  situacionRevista1: null, diaInicio1: null, situacionRevista2: null, diaInicio2: null, situacionRevista3: null, diaInicio3: null, vigenciaDesde: null,
}

const hoy = () => new Date().toISOString().slice(0, 10)

/** Desplegable de un catálogo de ARCA: el código con su descripción; si lo guardado ya no está activo en el catálogo, igual se muestra. */
function Lista({ valor, lista, onChange, deshabilitado }: { valor: string | null; lista: ItemCatalogo[]; onChange: (v: string | null) => void; deshabilitado: boolean }) {
  return (
    <select value={valor ?? ''} onChange={(e) => onChange(e.target.value || null)} disabled={deshabilitado} className={inputCls}>
      <option value="">Sin dato</option>
      {activos(lista).map((x) => <option key={x.codigo} value={x.codigo}>{x.codigo} — {x.descripcion}</option>)}
      {valor && !lista.some((x) => x.activo && x.codigo === valor) && <option value={valor}>{valor} — {nombreDe(lista, valor)}</option>}
    </select>
  )
}

/**
 * Datos de ARCA del empleado (Libro de Sueldos Digital y F.931): situación, condición, actividad, modalidad de contratación, incapacidad, zona y hasta tres
 * situaciones de revista. Cada lista sale de su catálogo. Al liquidar, el recibo copia estos datos: cambiarlos no modifica los recibos ya liquidados.
 */
export default function ArcaEmpleado({ id, puedeModificar }: { id: number; puedeModificar: boolean }) {
  const qc = useQueryClient()
  const cat = useCatalogos()
  const { data: actual } = useQuery({ queryKey: ['sueldos', 'arca', id], queryFn: () => getArca(id) })
  const { data: historial = [] } = useQuery({ queryKey: ['sueldos', 'arca-historial', id], queryFn: () => getHistorialArca(id) })
  const [f, setF] = useState<DatosArca>(vacio)
  const [desde, setDesde] = useState(hoy())
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  useEffect(() => { if (actual) setF(actual) }, [actual])

  const guardar = useMutation({
    mutationFn: () => guardarArca(id, { ...f, vigenciaDesde: desde }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sueldos', 'arca', id] }); qc.invalidateQueries({ queryKey: ['sueldos', 'arca-historial', id] })
      setMsg({ tipo: 'ok', texto: 'Datos de ARCA guardados.' })
    },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  const set = <K extends keyof DatosArca>(k: K, v: DatosArca[K]) => { setF({ ...f, [k]: v }); setMsg(null) }
  const dis = !puedeModificar
  const revistas = [
    { n: 1, sit: f.situacionRevista1, dia: f.diaInicio1, setSit: (v: string | null) => setF({ ...f, situacionRevista1: v, diaInicio1: v ? f.diaInicio1 : null }), setDia: (v: number | null) => set('diaInicio1', v) },
    { n: 2, sit: f.situacionRevista2, dia: f.diaInicio2, setSit: (v: string | null) => setF({ ...f, situacionRevista2: v, diaInicio2: v ? f.diaInicio2 : null }), setDia: (v: number | null) => set('diaInicio2', v) },
    { n: 3, sit: f.situacionRevista3, dia: f.diaInicio3, setSit: (v: string | null) => setF({ ...f, situacionRevista3: v, diaInicio3: v ? f.diaInicio3 : null }), setDia: (v: number | null) => set('diaInicio3', v) },
  ]

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Datos que se informan a ARCA (Libro de Sueldos Digital y F.931). Al liquidar, el recibo guarda los de ese momento: si los cambiás, los recibos ya hechos no se modifican.</p>
      <form onSubmit={(e) => { e.preventDefault(); setMsg(null); guardar.mutate() }} className="bg-white border border-gray-200 rounded-xl p-5 grid sm:grid-cols-2 gap-4">
        <Campo label="Modalidad de contratación"><Lista valor={f.modalidad} lista={cat.afipModalidades} onChange={(v) => set('modalidad', v)} deshabilitado={dis} /></Campo>
        <Campo label="Actividad"><Lista valor={f.actividad} lista={cat.afipActividades} onChange={(v) => set('actividad', v)} deshabilitado={dis} /></Campo>
        <Campo label="Situación"><Lista valor={f.situacion} lista={cat.afipSituaciones} onChange={(v) => set('situacion', v)} deshabilitado={dis} /></Campo>
        <Campo label="Condición"><Lista valor={f.condicion} lista={cat.afipCondiciones} onChange={(v) => set('condicion', v)} deshabilitado={dis} /></Campo>
        <Campo label="Incapacidad"><Lista valor={f.incapacidad} lista={cat.afipIncapacidades} onChange={(v) => set('incapacidad', v)} deshabilitado={dis} /></Campo>
        <Campo label="Zona"><Lista valor={f.codigoZona} lista={cat.afipZonas} onChange={(v) => set('codigoZona', v)} deshabilitado={dis} /></Campo>

        <div className="sm:col-span-2 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Situaciones de revista</h3>
          <div className="space-y-3">
            {revistas.map((r) => (
              <div key={r.n} className="grid sm:grid-cols-[1fr_8rem] gap-3">
                <Campo label={`Situación de revista ${r.n}`}><Lista valor={r.sit} lista={cat.afipSituaciones} onChange={r.setSit} deshabilitado={dis || (r.n > 1 && !revistas[r.n - 2].sit)} /></Campo>
                <Campo label="Día de inicio">
                  <input type="number" min={1} max={31} value={r.dia ?? ''} disabled={dis || !r.sit} onChange={(e) => r.setDia(e.target.value === '' ? null : Number(e.target.value))} className={inputCls} />
                </Campo>
              </div>
            ))}
          </div>
        </div>

        {puedeModificar && (
          <div className="sm:col-span-2 flex flex-wrap items-end gap-4 border-t border-gray-100 pt-4">
            <Campo label="Rigen desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} /></Campo>
            <BotonPrimario type="submit" disabled={guardar.isPending || !desde}>{guardar.isPending ? 'Guardando…' : 'Guardar datos de ARCA'}</BotonPrimario>
            <p className="text-xs text-gray-400 basis-full">Si cambiaste algo, queda una fila en el historial con esta fecha.</p>
          </div>
        )}
        {msg && <div className="sm:col-span-2"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      </form>

      <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">Historial</h3>
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 font-medium">Desde</th><th className="px-4 py-2 font-medium">Modalidad</th><th className="px-4 py-2 font-medium">Situación</th>
            <th className="px-4 py-2 font-medium">Condición</th><th className="px-4 py-2 font-medium">Actividad</th><th className="px-4 py-2 font-medium">Revista</th>
          </tr></thead>
          <tbody>
            {historial.map((h) => (
              <tr key={h.vigenciaDesde} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 whitespace-nowrap">{h.vigenciaDesde ? new Date(h.vigenciaDesde).toLocaleDateString('es-AR') : ''}</td>
                <td className="px-4 py-2">{h.modalidad ? `${h.modalidad} — ${nombreDe(cat.afipModalidades, h.modalidad)}` : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2">{h.situacion ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2">{h.condicion ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2">{h.actividad ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2">{[h.situacionRevista1 && `${h.situacionRevista1} (día ${h.diaInicio1})`, h.situacionRevista2 && `${h.situacionRevista2} (día ${h.diaInicio2})`, h.situacionRevista3 && `${h.situacionRevista3} (día ${h.diaInicio3})`].filter(Boolean).join(' · ') || <span className="text-gray-300">—</span>}</td>
              </tr>
            ))}
            {historial.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Todavía no hay datos de ARCA cargados para este empleado</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
