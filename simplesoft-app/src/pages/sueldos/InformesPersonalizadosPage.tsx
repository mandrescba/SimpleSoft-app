import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Download, FileText, Plus, Trash2, X } from 'lucide-react'
import {
  bajarInformePersonalizado, crearInformePersonalizado, ejecutarInformePersonalizado, eliminarInformePersonalizado, getInformePersonalizado, getInformesPersonalizados,
  getVariablesInforme, modificarInformePersonalizado, type CampoInforme, type FiltroInforme, type FuncionGrupo, type InformeEjecutado, type InformeForm, type TipoDatoInforme,
} from '../../api/informesPersonalizados'
import { TABLAS, type TablaExportador } from '../../api/exportadores'
import { getLiquidaciones } from '../../api/liquidaciones'
import { mensajeDeBlob } from '../../api/informes'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { Tabla } from './InformesPage'
import { preguntar } from '../../components/ui/Confirmar'

const TIPOS: { v: TipoDatoInforme; t: string }[] = [{ v: 'TEXTO', t: 'Texto' }, { v: 'ENTERO', t: 'Entero' }, { v: 'DECIMAL', t: 'Decimal' }, { v: 'FECHA', t: 'Fecha' }]
const FUNCIONES: { v: FuncionGrupo; t: string }[] = [{ v: 'SUM', t: 'Suma' }, { v: 'COUNT', t: 'Cantidad' }, { v: 'MIN', t: 'Mínimo' }, { v: 'MAX', t: 'Máximo' }, { v: 'AVG', t: 'Promedio' }]
const FORMATOS_FECHA = ['dd/MM/yyyy', 'MM/yyyy', 'yyyy-MM-dd', 'yyyyMMdd']

const nuevo: InformeForm = {
  codigo: '', descripcion: '', tabla: 'RECIBOS', ordenamiento: 'LEGAJO', condicion: null, orientacion: 'VERTICAL', orden: 0,
  campos: [
    { descripcion: 'Legajo', formula: 'LEGAJO', tipoDato: 'TEXTO', decimales: null, formato: null, visible: true, agrupado: false, funcionGrupo: null },
    { descripcion: 'Empleado', formula: "APELLIDO + ' ' + NOMBRE", tipoDato: 'TEXTO', decimales: null, formato: null, visible: true, agrupado: false, funcionGrupo: null },
  ],
}

/** Listado de informes personalizados. */
export function InformesPersonalizadosPage() {
  const puedeCrear = tienePermiso(permisosDelToken(useAuthStore((s) => s.token)), 'SLD', 'crear')
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'informes-personalizados'], queryFn: getInformesPersonalizados })
  const pag = usePaginado(data)
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Informes personalizados</h1>
          <p className="text-gray-500">Armá tus propios listados con fórmulas: qué filas, qué columnas, cómo se ordenan y se agrupan, con subtotales y total.</p>
        </div>
        {puedeCrear && <Link to="/sueldos/informes-personalizados/nuevo" className="inline-flex items-center gap-1.5 shrink-0 bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2 rounded-lg text-sm"><Plus size={16} /> Nuevo informe</Link>}
      </div>
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Informe</th><th className="px-4 py-2 font-medium">Descripción</th><th className="px-4 py-2 font-medium">Filas de</th><th className="px-4 py-2 font-medium text-right">Columnas</th>
            </tr></thead>
            <tbody>
              {pag.filas.map((x) => (
                <tr key={x.idInforme} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs"><Link to={`/sueldos/informes-personalizados/${x.idInforme}`} className="text-blue-700 hover:underline">{x.codigo}</Link></td>
                  <td className="px-4 py-2">{x.descripcion}</td>
                  <td className="px-4 py-2">{TABLAS.find((t) => t.v === x.tabla)?.t ?? x.tabla}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{x.campos}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Todavía no hay informes personalizados</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
    </div>
  )
}

type Foco = { tipo: 'campo'; i: number } | { tipo: 'condicion' } | { tipo: 'orden' } | null

/** Un informe personalizado: su definición, sus columnas y la ejecución (pantalla, PDF y Excel). */
export function InformePersonalizadoPage() {
  const { id: idParam } = useParams()
  const id = idParam ? Number(idParam) : 0
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const puedeModificar = tienePermiso(permisos, 'SLD', id === 0 ? 'crear' : 'modificar')
  const { data, isLoading } = useQuery({ queryKey: ['sueldos', 'informe-personalizado', id], queryFn: () => getInformePersonalizado(id), enabled: id > 0 })
  const [f, setF] = useState<InformeForm>(nuevo)
  const [sucio, setSucio] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [foco, setFoco] = useState<Foco>(null)
  const [filtroVar, setFiltroVar] = useState('')
  useEffect(() => { if (data) { setF({ ...data, campos: data.campos.map((c) => ({ ...c })) }); setSucio(false) } }, [data])

  const { data: variables } = useQuery({ queryKey: ['sueldos', 'informe-variables', f.tabla], queryFn: () => getVariablesInforme(f.tabla) })
  const visibles = useMemo(() => {
    const q = filtroVar.trim().toLowerCase()
    return (variables ?? []).filter((v) => !q || v.nombre.toLowerCase().includes(q) || v.descripcion.toLowerCase().includes(q))
  }, [variables, filtroVar])

  const cambia = (c: Partial<InformeForm>) => { setF((x) => ({ ...x, ...c })); setSucio(true); setMsg(null) }
  const setCampo = (i: number, c: Partial<CampoInforme>) => cambia({ campos: f.campos.map((x, k) => (k === i ? { ...x, ...c } : x)) })
  const mover = (i: number, d: number) => { const k = i + d; if (k < 0 || k >= f.campos.length) return; const l = [...f.campos]; [l[i], l[k]] = [l[k], l[i]]; cambia({ campos: l }) }

  /** Agrega el nombre de una variable al final de la fórmula donde se estaba escribiendo. */
  function insertar(nombre: string) {
    if (!foco) { setMsg({ tipo: 'error', texto: 'Hacé clic primero en la fórmula donde querés usar la variable.' }); return }
    const sumar = (t: string | null) => `${t ?? ''}${t && !/[\s(,+\-*/=<>]$/.test(t) ? ' ' : ''}${nombre}`
    if (foco.tipo === 'campo') setCampo(foco.i, { formula: sumar(f.campos[foco.i]?.formula ?? null) })
    else if (foco.tipo === 'condicion') cambia({ condicion: sumar(f.condicion) })
    else cambia({ ordenamiento: sumar(f.ordenamiento) })
  }

  const guardar = useMutation({
    mutationFn: () => (id === 0 ? crearInformePersonalizado(f) : modificarInformePersonalizado(id, f)),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['sueldos', 'informes-personalizados'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'informe-personalizado', id] })
      if (id === 0 && r && typeof r === 'object' && 'idInforme' in r) navigate(`/sueldos/informes-personalizados/${(r as { idInforme: number }).idInforme}`, { replace: true })
      else { setSucio(false); setMsg({ tipo: 'ok', texto: 'Informe guardado.' }) }
    },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const borrar = useMutation({
    mutationFn: () => eliminarInformePersonalizado(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'informes-personalizados'] }); navigate('/sueldos/informes-personalizados', { replace: true }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  if (id > 0 && isLoading) return <p className="text-sm text-gray-500">Cargando…</p>
  return (
    <div className="max-w-6xl">
      <Link to="/sueldos/informes-personalizados" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 mb-2"><ArrowLeft size={14} /> Informes personalizados</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{id === 0 ? 'Nuevo informe' : <><span className="font-mono">{f.codigo}</span> <span className="text-gray-400 font-normal text-lg">— {f.descripcion}</span></>}</h1>

      <section className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {id === 0 && <Campo label="Código"><input value={f.codigo} onChange={(e) => cambia({ codigo: e.target.value.toUpperCase().replace(/\s/g, '_') })} maxLength={40} placeholder="SUELDOS_POR_CENTRO" className={`${inputCls} font-mono`} /></Campo>}
        <Campo label="Título del informe" className={id === 0 ? 'lg:col-span-2' : 'lg:col-span-3'}><input value={f.descripcion} onChange={(e) => cambia({ descripcion: e.target.value })} disabled={!puedeModificar} maxLength={200} className={inputCls} /></Campo>
        <Campo label="Cada fila sale de">
          <select value={f.tabla} onChange={(e) => cambia({ tabla: e.target.value as TablaExportador })} disabled={!puedeModificar} className={inputCls}>{TABLAS.map((t) => <option key={t.v} value={t.v}>{t.t} — {t.ayuda}</option>)}</select>
        </Campo>
        <Campo label="Ordenar por (separado por coma; DESC al final)">
          <input value={f.ordenamiento ?? ''} onChange={(e) => cambia({ ordenamiento: e.target.value || null })} onFocus={() => setFoco({ tipo: 'orden' })} disabled={!puedeModificar} maxLength={40} placeholder="APELLIDO, SUELDO_NETO DESC" className={`${inputCls} font-mono`} />
        </Campo>
        <Campo label="Hoja en PDF"><select value={f.orientacion} onChange={(e) => cambia({ orientacion: e.target.value as 'VERTICAL' | 'HORIZONTAL' })} disabled={!puedeModificar} className={inputCls}><option value="VERTICAL">Vertical (se pasa a horizontal si hay muchas columnas)</option><option value="HORIZONTAL">Siempre horizontal</option></select></Campo>
        <Campo label="Solo las filas donde esta fórmula sea verdadera (opcional)" className="sm:col-span-2 lg:col-span-3">
          <input value={f.condicion ?? ''} onChange={(e) => cambia({ condicion: e.target.value || null })} onFocus={() => setFoco({ tipo: 'condicion' })} disabled={!puedeModificar} maxLength={512} placeholder="SUELDO_NETO > 0" className={`${inputCls} font-mono`} />
        </Campo>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800 text-sm">Columnas <span className="font-normal text-gray-400">({f.campos.length})</span></h2>
            {puedeModificar && <BotonSecundario onClick={() => cambia({ campos: [...f.campos, { descripcion: `Columna ${f.campos.length + 1}`, formula: null, tipoDato: 'TEXTO', decimales: null, formato: null, visible: true, agrupado: false, funcionGrupo: null }] })} className="inline-flex items-center gap-1.5"><Plus size={14} /> Agregar columna</BotonSecundario>}
          </div>
          <p className="text-xs text-gray-500 mb-2">Una columna <b>agrupada</b> corta el informe cada vez que cambia su valor. Las columnas con <b>función</b> muestran subtotal en cada corte y total al final.</p>
          <div className="grid gap-2">
            {f.campos.map((c, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <span className="text-xs text-gray-400 w-5 pb-2">{i + 1}</span>
                  <Campo label="Título" className="w-44"><input value={c.descripcion} onChange={(e) => setCampo(i, { descripcion: e.target.value })} disabled={!puedeModificar} maxLength={100} className={inputCls} /></Campo>
                  <Campo label="Tipo" className="w-28"><select value={c.tipoDato} onChange={(e) => setCampo(i, { tipoDato: e.target.value as TipoDatoInforme, funcionGrupo: e.target.value === 'ENTERO' || e.target.value === 'DECIMAL' ? c.funcionGrupo : c.funcionGrupo === 'COUNT' ? 'COUNT' : null })} disabled={!puedeModificar} className={inputCls}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}</select></Campo>
                  {c.tipoDato === 'DECIMAL' && <Campo label="Decimales" className="w-20"><input type="number" min={0} max={8} value={c.decimales ?? ''} placeholder="2" onChange={(e) => setCampo(i, { decimales: e.target.value === '' ? null : Number(e.target.value) })} disabled={!puedeModificar} className={inputCls} /></Campo>}
                  {c.tipoDato === 'FECHA' && <Campo label="Formato" className="w-32"><input list="fmt-fecha-inf" value={c.formato ?? ''} placeholder="dd/MM/yyyy" onChange={(e) => setCampo(i, { formato: e.target.value || null })} disabled={!puedeModificar} className={`${inputCls} font-mono`} /><datalist id="fmt-fecha-inf">{FORMATOS_FECHA.map((x) => <option key={x} value={x} />)}</datalist></Campo>}
                  <Campo label="Subtotal / total" className="w-32">
                    <select value={c.funcionGrupo ?? ''} onChange={(e) => setCampo(i, { funcionGrupo: (e.target.value || null) as FuncionGrupo | null })} disabled={!puedeModificar} className={inputCls}>
                      <option value="">—</option>{FUNCIONES.filter((x) => x.v === 'COUNT' || c.tipoDato === 'ENTERO' || c.tipoDato === 'DECIMAL').map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
                    </select>
                  </Campo>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 pb-2"><input type="checkbox" checked={c.agrupado} onChange={(e) => setCampo(i, { agrupado: e.target.checked })} disabled={!puedeModificar} /> Agrupar</label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 pb-2"><input type="checkbox" checked={c.visible} onChange={(e) => setCampo(i, { visible: e.target.checked })} disabled={!puedeModificar} /> Mostrar</label>
                  {puedeModificar && (
                    <div className="flex items-center gap-1 pb-2 ml-auto">
                      <button title="Subir" onClick={() => mover(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-blue-700 disabled:opacity-30"><ArrowUp size={15} /></button>
                      <button title="Bajar" onClick={() => mover(i, 1)} disabled={i === f.campos.length - 1} className="text-gray-400 hover:text-blue-700 disabled:opacity-30"><ArrowDown size={15} /></button>
                      <button title="Quitar la columna" onClick={() => { if (f.campos.length > 1) cambia({ campos: f.campos.filter((_, k) => k !== i) }) }} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                    </div>
                  )}
                </div>
                <textarea value={c.formula ?? ''} onChange={(e) => setCampo(i, { formula: e.target.value || null })} onFocus={() => setFoco({ tipo: 'campo', i })} disabled={!puedeModificar} rows={1} spellCheck={false}
                  placeholder="Fórmula del valor: LEGAJO, APELLIDO + ' ' + NOMBRE, SUELDO_NETO, #600, IF(#600>0,'RETENCION','DEVOLUCION')..." className={`${inputCls} font-mono mt-2`} />
              </div>
            ))}
          </div>
        </section>

        <aside className="bg-white border border-gray-200 rounded-xl p-3 self-start lg:sticky lg:top-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-1">Variables</h2>
          <p className="text-xs text-gray-500 mb-2">Hacé clic en una fórmula y después en la variable para agregarla.</p>
          <input value={filtroVar} onChange={(e) => setFiltroVar(e.target.value)} placeholder="Buscar" className={`${inputCls} mb-2`} />
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100 text-xs">
            {visibles.map((v) => (
              <li key={v.nombre}><button type="button" onClick={() => insertar(v.nombre)} className="w-full text-left py-1 hover:bg-blue-50 px-1" title={v.descripcion}>
                <span className="font-mono text-blue-800">{v.nombre}</span><span className="block text-gray-400">{v.descripcion}</span></button></li>
            ))}
            {visibles.length === 0 && <li className="py-2 text-gray-400 text-center">Sin resultados</li>}
          </ul>
        </aside>
      </div>

      {msg && <div className="mt-4"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      {puedeModificar && (
        <div className="mt-4 flex items-center gap-3">
          <BotonPrimario onClick={() => { setMsg(null); guardar.mutate() }} disabled={guardar.isPending || (id > 0 && !sucio) || !f.descripcion.trim() || (id === 0 && !f.codigo.trim())}>{guardar.isPending ? 'Guardando…' : 'Guardar informe'}</BotonPrimario>
          {sucio && <span className="text-xs text-amber-700">Hay cambios sin guardar</span>}
          {id > 0 && tienePermiso(permisos, 'SLD', 'eliminar') && (
            <BotonSecundario onClick={() => { setMsg(null); preguntar(`¿Borrar el informe ${f.codigo}?`, () => borrar.mutate(), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} disabled={borrar.isPending} className="ml-auto inline-flex items-center gap-1.5 text-red-600"><Trash2 size={14} /> Borrar informe</BotonSecundario>
          )}
        </div>
      )}

      {id > 0 && <Ejecutar id={id} tabla={f.tabla} sucio={sucio} />}
    </div>
  )
}

/** Ejecutar el informe guardado: se ve acá y se baja en PDF o Excel. */
function Ejecutar({ id, tabla, sucio }: { id: number; tabla: TablaExportador; sucio: boolean }) {
  const necesitaPeriodo = tabla === 'RECIBOS' || tabla === 'CONCEPTOS_RECIBO'
  const { data: liquidaciones } = useQuery({ queryKey: ['sueldos', 'liquidaciones'], queryFn: getLiquidaciones, enabled: necesitaPeriodo })
  const [modo, setModo] = useState<'liq' | 'fechas'>('liq')
  const [idLiq, setIdLiq] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [bajas, setBajas] = useState(false)
  const [omitir, setOmitir] = useState(false)
  const [res, setRes] = useState<InformeEjecutado | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const filtro = (): FiltroInforme => necesitaPeriodo
    ? (modo === 'liq' ? { idLiquidacion: Number(idLiq), omitirConError: omitir } : { desde, hasta, omitirConError: omitir })
    : { incluirBajas: bajas, omitirConError: omitir }
  const listo = !necesitaPeriodo || (modo === 'liq' ? !!idLiq : !!desde && !!hasta)

  const ver = useMutation({ mutationFn: () => ejecutarInformePersonalizado(id, filtro()), onSuccess: (r) => { setRes(r); setMsg(null) }, onError: (e) => { setRes(null); setMsg({ tipo: 'error', texto: mensajeDeError(e) }) } })
  const bajar = useMutation({
    mutationFn: (fmt: 'pdf' | 'xlsx') => bajarInformePersonalizado(id, filtro(), fmt),
    onSuccess: () => setMsg(null),
    onError: async (e) => setMsg({ tipo: 'error', texto: await mensajeDeBlob(e) }),
  })
  return (
    <section className="mt-8">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold text-gray-800 mb-1">Ver el informe</h2>
        {sucio && <p className="text-xs text-amber-700 mb-2">Hay cambios sin guardar: se usa el informe guardado.</p>}
        <div className="flex flex-wrap items-end gap-3">
          {necesitaPeriodo ? (
            <>
              <Campo label="Alcance" className="w-44"><select value={modo} onChange={(e) => { setModo(e.target.value as 'liq' | 'fechas'); setRes(null) }} className={inputCls}><option value="liq">Una liquidación</option><option value="fechas">Rango de fechas de recibo</option></select></Campo>
              {modo === 'liq' ? (
                <Campo label="Liquidación" className="w-64">
                  <select value={idLiq} onChange={(e) => { setIdLiq(e.target.value); setRes(null) }} className={inputCls}>
                    <option value="">— elegí la liquidación —</option>
                    {liquidaciones?.map((l) => <option key={l.idLiquidacion} value={l.idLiquidacion}>{l.periodo} · {l.tipo} · {l.recibos} recibos</option>)}
                  </select>
                </Campo>
              ) : (
                <>
                  <Campo label="Desde"><input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setRes(null) }} className={inputCls} /></Campo>
                  <Campo label="Hasta"><input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setRes(null) }} className={inputCls} /></Campo>
                </>
              )}
            </>
          ) : <label className="inline-flex items-center gap-2 text-sm text-gray-700 pb-2"><input type="checkbox" checked={bajas} onChange={(e) => { setBajas(e.target.checked); setRes(null) }} /> Incluir empleados dados de baja</label>}
          <BotonPrimario onClick={() => { setMsg(null); ver.mutate() }} disabled={!listo || ver.isPending}>{ver.isPending ? 'Generando…' : 'Ver informe'}</BotonPrimario>
          <BotonSecundario onClick={() => bajar.mutate('pdf')} disabled={!listo || bajar.isPending} className="inline-flex items-center gap-1.5"><FileText size={14} /> PDF</BotonSecundario>
          <BotonSecundario onClick={() => bajar.mutate('xlsx')} disabled={!listo || bajar.isPending} className="inline-flex items-center gap-1.5"><Download size={14} /> Excel</BotonSecundario>
          <label className="inline-flex items-center gap-2 text-xs text-gray-500 pb-2"><input type="checkbox" checked={omitir} onChange={(e) => setOmitir(e.target.checked)} /> Omitir las filas con error al bajar</label>
        </div>
      </div>
      {msg && <div className="mt-3"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      {res && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-gray-800">{res.tabla.titulo}</h2>
          <p className="text-sm text-gray-500 mb-2">{res.tabla.subtitulo}{res.excluidas > 0 && <>{res.tabla.subtitulo ? ' · ' : ''}{res.excluidas} afuera por la condición</>}</p>
          {res.errores.length > 0 && (
            <ul className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 space-y-0.5">
              {res.errores.slice(0, 8).map((e, i) => <li key={i}><b>{e.fila}</b> · {e.campo}: {e.mensaje}</li>)}
              {res.errores.length > 8 && <li>… y {res.errores.length - 8} más</li>}
            </ul>
          )}
          <Tabla t={res.tabla} />
        </div>
      )}
    </section>
  )
}
