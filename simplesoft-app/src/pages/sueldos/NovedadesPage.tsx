import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Save } from 'lucide-react'
import { aplicarAutomatica, getGrilla, guardarLote, vistaAutomatica, type NovedadAutomatica, type Periodicidad, type ResultadoLote } from '../../api/novedades'
import { getTiposNovedad } from '../../api/configuracion'
import { getEmpleados } from '../../api/empleados'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { preguntar } from '../../components/ui/Confirmar'

type Pestania = 'planilla' | 'secuencial' | 'automaticas'

const PERIODICIDADES: { v: Periodicidad; t: string }[] = [{ v: 'MENSUAL', t: 'Mensual (una por mes)' }, { v: 'SEMANAL', t: 'Semanal (una por semana)' }, { v: 'DIARIA', t: 'Diaria (una por día)' }]
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const aFecha = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`)
const primeroDelMes = () => { const h = new Date(); return iso(new Date(h.getFullYear(), h.getMonth(), 1)) }
const ultimoDelMes = () => { const h = new Date(); return iso(new Date(h.getFullYear(), h.getMonth() + 1, 0)) }
const numero = (t: string) => { const n = Number(t.trim().replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const resumen = (r: ResultadoLote) => [r.creadas && `${r.creadas} creadas`, r.modificadas && `${r.modificadas} modificadas`, r.eliminadas && `${r.eliminadas} borradas`].filter(Boolean).join(', ') || 'No hubo cambios'

/** Encabezado de una columna de fecha según la periodicidad. */
function titulo(fecha: string, per: Periodicidad) {
  const d = aFecha(fecha)
  if (per === 'MENSUAL') return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  if (per === 'SEMANAL') return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${String(d.getDate()).padStart(2, '0')} ${DIAS[d.getDay()]}`
}

function useTipos() { return useQuery({ queryKey: ['sueldos', 'tipos-novedad'], queryFn: getTiposNovedad }) }

function SelectorTipo({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const { data } = useTipos()
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">— elegí un tipo —</option>
      {data?.map((t) => <option key={t.codigo} value={t.codigo}>{t.descripcion} ({t.codigo})</option>)}
    </select>
  )
}

// ---------------------------------------------------------------- planilla

function Planilla({ puede }: { puede: boolean }) {
  const qc = useQueryClient()
  const [f, setF] = useState({ codigoTipo: '', periodicidad: 'MENSUAL' as Periodicidad, desde: primeroDelMes(), hasta: ultimoDelMes(), grupo: '', centroCosto: '', buscar: '', incluirBajas: false })
  const [ediciones, setEdiciones] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const listo = !!f.codigoTipo && !!f.desde && !!f.hasta && f.desde <= f.hasta
  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['sueldos', 'novedades-grilla', f], queryFn: () => getGrilla(f), enabled: listo, retry: false,
  })
  useEffect(() => { setEdiciones({}) }, [data])

  const original = useMemo(() => {
    const m = new Map<string, string>()
    data?.valores.forEach((v) => m.set(`${v.idEmpleado}|${v.fecha.slice(0, 10)}`, v.valor ?? ''))
    return m
  }, [data])
  const valorDe = (clave: string) => ediciones[clave] ?? original.get(clave) ?? ''
  const pendientes = Object.entries(ediciones).filter(([k, v]) => v.trim() !== (original.get(k) ?? ''))

  const guardar = useMutation({
    mutationFn: () => guardarLote(f.codigoTipo, pendientes.map(([k, v]) => { const [id, fecha] = k.split('|'); return { idEmpleado: Number(id), fecha, valor: v.trim() === '' ? null : v.trim() } })),
    onSuccess: (r) => { setMsg({ tipo: 'ok', texto: `Guardado: ${resumen(r)}.` }); qc.invalidateQueries({ queryKey: ['sueldos', 'novedades-grilla'] }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const numerico = data?.tipoDato === 'ENTERO' || data?.tipoDato === 'DECIMAL'
  const cambia = (k: string, v: string) => { setEdiciones({ ...ediciones, [k]: v }); setMsg(null) }

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Tipo de novedad"><SelectorTipo valor={f.codigoTipo} onChange={(v) => setF({ ...f, codigoTipo: v })} /></Campo>
        <Campo label="Periodicidad"><select value={f.periodicidad} onChange={(e) => setF({ ...f, periodicidad: e.target.value as Periodicidad })} className={inputCls}>{PERIODICIDADES.map((p) => <option key={p.v} value={p.v}>{p.t}</option>)}</select></Campo>
        <Campo label="Desde"><input type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} className={inputCls} /></Campo>
        <Campo label="Hasta"><input type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} className={inputCls} /></Campo>
        <Campo label="Grupo de empleados"><input value={f.grupo} onChange={(e) => setF({ ...f, grupo: e.target.value })} placeholder="Todos" className={inputCls} /></Campo>
        <Campo label="Centro de costo"><input value={f.centroCosto} onChange={(e) => setF({ ...f, centroCosto: e.target.value })} placeholder="Todos" className={inputCls} /></Campo>
        <Campo label="Buscar empleado"><input value={f.buscar} onChange={(e) => setF({ ...f, buscar: e.target.value })} placeholder="Legajo, apellido o nombre" className={inputCls} /></Campo>
        <label className="inline-flex items-end gap-2 text-sm text-gray-600 pb-2"><input type="checkbox" checked={f.incluirBajas} onChange={(e) => setF({ ...f, incluirBajas: e.target.checked })} /> Incluir dados de baja</label>
      </div>

      {!f.codigoTipo && <p className="text-sm text-gray-500">Elegí el tipo de novedad y el período para ver la planilla.</p>}
      {isFetching && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}
      {msg && <div className="mb-3"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}

      {data && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-auto max-h-[65vh]">
            <table className="text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-3 py-2 font-medium sticky left-0 bg-gray-50">Empleado</th>
                  {data.fechas.map((fe) => {
                    const finde = f.periodicidad === 'DIARIA' && [0, 6].includes(aFecha(fe).getDay())
                    return <th key={fe} className={`px-1 py-2 font-medium text-center whitespace-nowrap ${finde ? 'text-amber-700 bg-amber-50' : ''}`}>{titulo(fe, f.periodicidad)}</th>
                  })}
                  {numerico && <th className="px-3 py-2 font-medium text-right">Total</th>}
                </tr>
              </thead>
              <tbody>
                {data.empleados.map((e) => (
                  <tr key={e.idEmpleado} className="border-t border-gray-100">
                    <td className="px-3 py-1 whitespace-nowrap sticky left-0 bg-white"><span className="font-mono text-xs text-gray-400 mr-2">{e.legajo}</span>{e.nombre}</td>
                    {data.fechas.map((fe) => {
                      const k = `${e.idEmpleado}|${fe.slice(0, 10)}`
                      const cambio = k in ediciones && ediciones[k].trim() !== (original.get(k) ?? '')
                      return (
                        <td key={fe} className="px-0.5 py-0.5">
                          <input value={valorDe(k)} onChange={(ev) => cambia(k, ev.target.value)} disabled={!puede} aria-label={`${e.legajo} ${fe.slice(0, 10)}`}
                            className={`w-16 border rounded px-1.5 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 ${cambio ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} />
                        </td>
                      )
                    })}
                    {numerico && <td className="px-3 py-1 text-right tabular-nums font-medium">{data.fechas.reduce((s, fe) => s + numero(valorDe(`${e.idEmpleado}|${fe.slice(0, 10)}`)), 0).toLocaleString('es-AR', { maximumFractionDigits: 4 })}</td>}
                  </tr>
                ))}
                {data.empleados.length === 0 && <tr><td colSpan={data.fechas.length + 2} className="px-4 py-8 text-center text-gray-400">No hay empleados para esos filtros</td></tr>}
              </tbody>
            </table>
          </div>
          {puede && (
            <div className="mt-3 flex items-center gap-3">
              <BotonPrimario onClick={() => { setMsg(null); guardar.mutate() }} disabled={pendientes.length === 0 || guardar.isPending} className="inline-flex items-center gap-1.5"><Save size={16} /> {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}</BotonPrimario>
              <span className="text-sm text-gray-500">{pendientes.length === 0 ? 'Sin cambios' : `${pendientes.length} ${pendientes.length === 1 ? 'celda modificada' : 'celdas modificadas'}`}</span>
              {pendientes.length > 0 && <BotonSecundario onClick={() => setEdiciones({})}>Descartar</BotonSecundario>}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Una celda vacía no tiene novedad: si borrás un valor ya cargado, se elimina al guardar.</p>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- secuencial

interface Cargada { legajo: string; nombre: string; fecha: string; valor: string; ok: boolean; mensaje?: string }

function Secuencial({ puede }: { puede: boolean }) {
  const [tipo, setTipo] = useState('')
  const [fijo, setFijo] = useState<'fecha' | 'empleado'>('fecha')
  const [fecha, setFecha] = useState(primeroDelMes())
  const [mensual, setMensual] = useState(true)
  const [legajo, setLegajo] = useState('')
  const [valor, setValor] = useState('')
  const [hist, setHist] = useState<Cargada[]>([])
  const refLegajo = useRef<HTMLInputElement>(null)
  const refValor = useRef<HTMLInputElement>(null)
  const refFecha = useRef<HTMLInputElement>(null)
  const { data: empleados } = useQuery({ queryKey: ['sueldos', 'empleados', '', false], queryFn: () => getEmpleados('', false) })
  const porLegajo = useMemo(() => new Map((empleados ?? []).map((e) => [e.legajo.trim().toLowerCase(), e])), [empleados])
  const emp = porLegajo.get(legajo.trim().toLowerCase())

  const guardar = useMutation({
    mutationFn: (c: { idEmpleado: number; fecha: string; valor: string; legajo: string; nombre: string }) =>
      guardarLote(tipo, [{ idEmpleado: c.idEmpleado, fecha: c.fecha, valor: c.valor.trim() === '' ? null : c.valor.trim() }]),
    onSuccess: (_, c) => setHist((h) => [{ legajo: c.legajo, nombre: c.nombre, fecha: c.fecha, valor: c.valor, ok: true }, ...h].slice(0, 20)),
    onError: (e, c) => setHist((h) => [{ legajo: c.legajo, nombre: c.nombre, fecha: c.fecha, valor: c.valor, ok: false, mensaje: mensajeDeError(e) }, ...h].slice(0, 20)),
  })

  function cargar() {
    if (!tipo || !emp || !fecha || valor.trim() === '') return
    const f = mensual ? `${fecha.slice(0, 7)}-01` : fecha
    guardar.mutate({ idEmpleado: emp.idEmpleado, fecha: f, valor, legajo: emp.legajo, nombre: `${emp.apellido}, ${emp.nombre}` })
    setValor('')
    if (fijo === 'fecha') { setLegajo(''); refLegajo.current?.focus() } else refFecha.current?.focus()
  }

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Tipo de novedad"><SelectorTipo valor={tipo} onChange={setTipo} /></Campo>
        <Campo label="Dejo fijo">
          <select value={fijo} onChange={(e) => { setFijo(e.target.value as 'fecha' | 'empleado'); setLegajo(''); setValor('') }} className={inputCls}>
            <option value="fecha">La fecha (cargo varios empleados)</option><option value="empleado">El empleado (cargo varias fechas)</option>
          </select>
        </Campo>
        {fijo === 'empleado' && <Campo label="Legajo"><input list="legajos-sec" value={legajo} onChange={(e) => setLegajo(e.target.value)} className={inputCls} />
          <p className="text-xs text-gray-500 mt-1 h-4">{emp ? `${emp.apellido}, ${emp.nombre}` : legajo && 'No existe ese legajo'}</p></Campo>}
        {fijo === 'fecha' && <Campo label="Fecha"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></Campo>}
        <label className="inline-flex items-end gap-2 text-sm text-gray-600 pb-2"><input type="checkbox" checked={mensual} onChange={(e) => setMensual(e.target.checked)} /> Es mensual (se guarda en el día 1 del mes)</label>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          {fijo === 'fecha' ? (
            <>
              <Campo label="Legajo" className="w-40">
                <input ref={refLegajo} list="legajos-sec" value={legajo} onChange={(e) => setLegajo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); refValor.current?.focus() } }} disabled={!puede || !tipo} autoFocus className={inputCls} />
              </Campo>
              <p className="text-sm text-gray-600 pb-2 min-w-48">{emp ? `${emp.apellido}, ${emp.nombre}` : legajo ? <span className="text-red-600">No existe ese legajo</span> : ''}</p>
            </>
          ) : (
            <Campo label="Fecha" className="w-44"><input ref={refFecha} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); refValor.current?.focus() } }} disabled={!puede || !tipo} className={inputCls} /></Campo>
          )}
          <Campo label="Valor" className="w-40">
            <input ref={refValor} value={valor} onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); cargar() } }} disabled={!puede || !tipo} inputMode="decimal" className={inputCls} />
          </Campo>
          <BotonPrimario onClick={cargar} disabled={!puede || !tipo || !emp || valor.trim() === '' || guardar.isPending}>Cargar</BotonPrimario>
        </div>
        <p className="text-xs text-gray-400 mt-2">Escribí el legajo, Enter, el valor y Enter: se guarda y queda listo para el siguiente.</p>
        <datalist id="legajos-sec">{empleados?.map((e) => <option key={e.idEmpleado} value={e.legajo}>{e.apellido}, {e.nombre}</option>)}</datalist>
      </div>

      {hist.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100"><th className="px-4 py-2 font-medium">Empleado</th><th className="px-4 py-2 font-medium">Fecha</th><th className="px-4 py-2 font-medium text-right">Valor</th><th className="px-4 py-2 font-medium">Estado</th></tr></thead>
            <tbody>
              {hist.map((h, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-1.5"><span className="font-mono text-xs text-gray-400 mr-2">{h.legajo}</span>{h.nombre}</td>
                  <td className="px-4 py-1.5">{aFecha(h.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums">{h.valor}</td>
                  <td className="px-4 py-1.5">{h.ok ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={14} /> Guardada</span> : <span className="text-red-600">{h.mensaje}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- automáticas

function Automaticas({ puede }: { puede: boolean }) {
  const qc = useQueryClient()
  const [f, setF] = useState({ codigoTipo: '', periodicidad: 'MENSUAL' as Periodicidad, desde: primeroDelMes(), hasta: ultimoDelMes(), valor: '', modo: 'CREAR' as NovedadAutomatica['modo'], grupo: '', centroCosto: '', legajos: '' })
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const pedido = (): NovedadAutomatica => ({
    codigoTipo: f.codigoTipo, periodicidad: f.periodicidad, desde: f.desde, hasta: f.hasta, valor: f.valor, modo: f.modo,
    grupo: f.grupo.trim() || undefined, centroCosto: f.centroCosto.trim() || undefined,
    legajos: f.legajos.split(/[\s,;]+/).filter(Boolean).length ? f.legajos.split(/[\s,;]+/).filter(Boolean) : undefined,
  })
  const completo = !!f.codigoTipo && !!f.desde && !!f.hasta && f.valor.trim() !== ''

  const vista = useMutation({ mutationFn: () => vistaAutomatica(pedido()), onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }) })
  const aplicar = useMutation({
    mutationFn: () => aplicarAutomatica(pedido()),
    onSuccess: (r) => { setMsg({ tipo: 'ok', texto: `Listo: ${resumen(r)}.` }); vista.reset(); qc.invalidateQueries({ queryKey: ['sueldos', 'novedades-grilla'] }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const cambia = (c: Partial<typeof f>) => { setF({ ...f, ...c }); vista.reset(); setMsg(null) }

  return (
    <div>
      <div className="bg-blue-50 border border-blue-100 text-blue-900 text-sm rounded-xl px-4 py-3 mb-4">
        Cargá la <b>misma novedad a un grupo de empleados</b> de una vez (por ejemplo un adelanto, o los días de licencia de toda un área). Primero mirá a quiénes alcanza y recién después aplicala.
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Tipo de novedad"><SelectorTipo valor={f.codigoTipo} onChange={(v) => cambia({ codigoTipo: v })} /></Campo>
        <Campo label="Periodicidad"><select value={f.periodicidad} onChange={(e) => cambia({ periodicidad: e.target.value as Periodicidad })} className={inputCls}>{PERIODICIDADES.map((p) => <option key={p.v} value={p.v}>{p.t}</option>)}</select></Campo>
        <Campo label="Desde"><input type="date" value={f.desde} onChange={(e) => cambia({ desde: e.target.value })} className={inputCls} /></Campo>
        <Campo label="Hasta"><input type="date" value={f.hasta} onChange={(e) => cambia({ hasta: e.target.value })} className={inputCls} /></Campo>
        <Campo label="Valor"><input value={f.valor} onChange={(e) => cambia({ valor: e.target.value })} inputMode="decimal" className={inputCls} /></Campo>
        <Campo label="Si la novedad ya existe">
          <select value={f.modo} onChange={(e) => cambia({ modo: e.target.value as NovedadAutomatica['modo'] })} className={inputCls}>
            <option value="CREAR">Crear solo las que faltan (no pisar)</option><option value="MODIFICAR">Modificar solo las existentes</option><option value="AMBOS">Crear o modificar</option>
          </select>
        </Campo>
        <Campo label="Grupo de empleados"><input value={f.grupo} onChange={(e) => cambia({ grupo: e.target.value })} placeholder="Todos" className={inputCls} /></Campo>
        <Campo label="Centro de costo"><input value={f.centroCosto} onChange={(e) => cambia({ centroCosto: e.target.value })} placeholder="Todos" className={inputCls} /></Campo>
        <Campo label="Solo estos legajos (opcional)" className="sm:col-span-2 lg:col-span-4"><input value={f.legajos} onChange={(e) => cambia({ legajos: e.target.value })} placeholder="101, 102, 105 (separados por coma o espacio)" className={inputCls} /></Campo>
      </div>

      <div className="flex gap-3 mb-4">
        <BotonSecundario onClick={() => { setMsg(null); vista.mutate() }} disabled={!completo || vista.isPending}>{vista.isPending ? 'Calculando…' : 'Ver a quiénes alcanza'}</BotonSecundario>
        {puede && vista.data && <BotonPrimario onClick={() => { preguntar(`Se van a crear ${vista.data!.aCrear} y modificar ${vista.data!.aModificar} novedades. ¿Aplicar?`, () => { setMsg(null); aplicar.mutate() }, { titulo: 'Aplicar novedades', boton: 'Aplicar' }) }} disabled={aplicar.isPending || (vista.data.aCrear + vista.data.aModificar === 0)}>{aplicar.isPending ? 'Aplicando…' : 'Aplicar'}</BotonPrimario>}
      </div>
      {msg && <div className="mb-3"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}

      {vista.data && (
        <div>
          <p className="text-sm text-gray-600 mb-2">{vista.data.empleados.length} empleados · {vista.data.fechas} {vista.data.fechas === 1 ? 'fecha' : 'fechas'} cada uno · <b>{vista.data.aCrear}</b> por crear · <b>{vista.data.aModificar}</b> por modificar</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-auto max-h-[45vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50"><tr className="text-left text-xs text-gray-500"><th className="px-4 py-2 font-medium">Empleado</th><th className="px-4 py-2 font-medium text-right">Se crean</th><th className="px-4 py-2 font-medium text-right">Se modifican</th></tr></thead>
              <tbody>
                {vista.data.empleados.map((e) => (
                  <tr key={e.legajo} className="border-t border-gray-100"><td className="px-4 py-1.5"><span className="font-mono text-xs text-gray-400 mr-2">{e.legajo}</span>{e.nombre}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{e.aCrear}</td><td className="px-4 py-1.5 text-right tabular-nums">{e.aModificar}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/** Carga masiva de novedades: planilla de empleados por fecha, ingreso secuencial y novedades automáticas para un grupo. */
export default function NovedadesPage() {
  const puede = tienePermiso(permisosDelToken(useAuthStore((s) => s.token)), 'SLD', 'modificar')
  const [tab, setTab] = useState<Pestania>('planilla')
  const tabs: { clave: Pestania; titulo: string }[] = [{ clave: 'planilla', titulo: 'Planilla' }, { clave: 'secuencial', titulo: 'Ingreso secuencial' }, { clave: 'automaticas', titulo: 'Automáticas' }]
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Novedades</h1>
      <p className="text-gray-500 mb-4">Horas extra, adelantos y demás datos del mes. Se cargan antes de liquidar y las fórmulas los toman por su código (si se cargan por día o por semana, se suman en el período). Para subir un Excel, usá Importar desde Excel.</p>
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {tabs.map((t) => (
          <button key={t.clave} onClick={() => setTab(t.clave)} className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${tab === t.clave ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{t.titulo}</button>
        ))}
      </div>
      {tab === 'planilla' && <Planilla puede={puede} />}
      {tab === 'secuencial' && <Secuencial puede={puede} />}
      {tab === 'automaticas' && <Automaticas puede={puede} />}
    </div>
  )
}
