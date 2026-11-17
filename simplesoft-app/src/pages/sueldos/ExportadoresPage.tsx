import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Download, Plus, Trash2, X } from 'lucide-react'
import {
  TABLAS, bajarExportacion, crearExportador, eliminarExportador, getExportador, getExportadores, getVariablesExportador, modificarExportador, vistaExportador,
  type CampoExportador, type ExportadorForm, type FormatoDecimal, type TablaExportador, type TipoDatoCampo, type VistaExportacion,
} from '../../api/exportadores'
import { getLiquidaciones } from '../../api/liquidaciones'
import { mensajeDeBlob } from '../../api/informes'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { preguntar } from '../../components/ui/Confirmar'

const FORMATOS_DECIMAL: { v: FormatoDecimal; t: string }[] = [
  { v: 'PUNTO', t: '1234.56 (punto decimal)' }, { v: 'COMA', t: '1234,56 (coma decimal)' }, { v: 'MILES', t: '1.234,56 (con separador de miles)' }, { v: 'SIN_SEPARADOR', t: '123456 (sin separador, decimales implícitos)' },
]
const FORMATOS_FECHA = ['dd/MM/yyyy', 'yyyy-MM-dd', 'yyyyMMdd', 'ddMMyyyy', 'dd-MM-yyyy', 'dd.MM.yyyy', 'MM/yyyy', 'yyyyMM']
const SEPARADORES: { v: string; t: string }[] = [{ v: ';', t: 'Punto y coma ( ; )' }, { v: ',', t: 'Coma ( , )' }, { v: '|', t: 'Barra vertical ( | )' }, { v: '\t', t: 'Tabulación' }, { v: '', t: 'Sin separador: campos de ancho fijo' }]
const TIPOS: { v: TipoDatoCampo; t: string }[] = [{ v: 'TEXTO', t: 'Texto' }, { v: 'ENTERO', t: 'Entero' }, { v: 'DECIMAL', t: 'Decimal' }, { v: 'FECHA', t: 'Fecha' }]

const nuevo: ExportadorForm = {
  codigo: '', descripcion: '', tabla: 'RECIBOS', separador: ';', formatoDecimal: 'PUNTO', formatoFecha: 'dd/MM/yyyy', codificacion: 'UTF8', conEncabezado: true,
  formulaCondicion: null, formulaArchivo: null, activo: true, orden: 0, campos: [{ nombre: 'Legajo', tipoDato: 'TEXTO', longitud: null, decimales: null, formatoDecimal: null, formula: 'LEGAJO' }],
}

/** Listado de exportadores (formatos de exportación de archivos). */
export function ExportadoresPage() {
  const puedeCrear = tienePermiso(permisosDelToken(useAuthStore((s) => s.token)), 'SLD', 'crear')
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'exportadores'], queryFn: getExportadores })
  const pag = usePaginado(data)
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Exportación de archivos</h1>
          <p className="text-gray-500">Formatos para generar archivos de texto con los datos de Sueldos: qué filas, qué campos, con separador o de ancho fijo.</p>
        </div>
        {puedeCrear && <Link to="/sueldos/exportadores/nuevo" className="inline-flex items-center gap-1.5 shrink-0 bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2 rounded-lg text-sm"><Plus size={16} /> Nuevo formato</Link>}
      </div>
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Formato</th><th className="px-4 py-2 font-medium">Descripción</th><th className="px-4 py-2 font-medium">Filas de</th><th className="px-4 py-2 font-medium text-right">Campos</th>
            </tr></thead>
            <tbody>
              {pag.filas.map((x) => (
                <tr key={x.idExportador} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${x.activo ? '' : 'text-gray-400'}`}>
                  <td className="px-4 py-2 font-mono text-xs"><Link to={`/sueldos/exportadores/${x.idExportador}`} className="text-blue-700 hover:underline">{x.codigo}</Link></td>
                  <td className="px-4 py-2">{x.descripcion}</td>
                  <td className="px-4 py-2">{TABLAS.find((t) => t.v === x.tabla)?.t ?? x.tabla}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{x.campos}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Todavía no hay formatos de exportación</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
    </div>
  )
}

type Foco = { tipo: 'campo'; i: number } | { tipo: 'condicion' } | { tipo: 'archivo' } | null

/** Un formato de exportación: su definición, sus campos y la prueba / descarga del archivo. */
export function ExportadorPage() {
  const { id: idParam } = useParams()
  const id = idParam ? Number(idParam) : 0
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const puedeModificar = tienePermiso(permisos, 'SLD', id === 0 ? 'crear' : 'modificar')
  const { data, isLoading } = useQuery({ queryKey: ['sueldos', 'exportador', id], queryFn: () => getExportador(id), enabled: id > 0 })
  const [f, setF] = useState<ExportadorForm>(nuevo)
  const [sucio, setSucio] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [foco, setFoco] = useState<Foco>(null)
  const [filtroVar, setFiltroVar] = useState('')
  useEffect(() => { if (data) { setF({ ...data, campos: data.campos.map((c) => ({ ...c })) }); setSucio(false) } }, [data])

  const { data: variables } = useQuery({ queryKey: ['sueldos', 'exportador-variables', f.tabla], queryFn: () => getVariablesExportador(f.tabla) })
  const visibles = useMemo(() => {
    const q = filtroVar.trim().toLowerCase()
    return (variables ?? []).filter((v) => !q || v.nombre.toLowerCase().includes(q) || v.descripcion.toLowerCase().includes(q))
  }, [variables, filtroVar])

  const cambia = (c: Partial<ExportadorForm>) => { setF((x) => ({ ...x, ...c })); setSucio(true); setMsg(null) }
  const setCampo = (i: number, c: Partial<CampoExportador>) => cambia({ campos: f.campos.map((x, k) => (k === i ? { ...x, ...c } : x)) })
  const mover = (i: number, d: number) => { const k = i + d; if (k < 0 || k >= f.campos.length) return; const l = [...f.campos]; [l[i], l[k]] = [l[k], l[i]]; cambia({ campos: l }) }
  const fijo = !f.separador

  /** Agrega el nombre de una variable al final de la fórmula donde se estaba escribiendo. */
  function insertar(nombre: string) {
    if (!foco) { setMsg({ tipo: 'error', texto: 'Hacé clic primero en la fórmula donde querés usar la variable.' }); return }
    const sumar = (t: string | null) => `${t ?? ''}${t && !/[\s(,+\-*/=<>]$/.test(t) ? ' ' : ''}${nombre}`
    if (foco.tipo === 'campo') setCampo(foco.i, { formula: sumar(f.campos[foco.i]?.formula ?? null) })
    else if (foco.tipo === 'condicion') cambia({ formulaCondicion: sumar(f.formulaCondicion) })
    else cambia({ formulaArchivo: sumar(f.formulaArchivo) })
  }

  const guardar = useMutation({
    mutationFn: () => (id === 0 ? crearExportador(f) : modificarExportador(id, f)),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['sueldos', 'exportadores'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'exportador', id] })
      if (id === 0 && r && typeof r === 'object' && 'idExportador' in r) navigate(`/sueldos/exportadores/${(r as { idExportador: number }).idExportador}`, { replace: true })
      else { setSucio(false); setMsg({ tipo: 'ok', texto: 'Formato guardado.' }) }
    },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const borrar = useMutation({
    mutationFn: () => eliminarExportador(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'exportadores'] }); navigate('/sueldos/exportadores', { replace: true }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  if (id > 0 && isLoading) return <p className="text-sm text-gray-500">Cargando…</p>
  return (
    <div className="max-w-6xl">
      <Link to="/sueldos/exportadores" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 mb-2"><ArrowLeft size={14} /> Exportación de archivos</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{id === 0 ? 'Nuevo formato de exportación' : <><span className="font-mono">{f.codigo}</span> <span className="text-gray-400 font-normal text-lg">— {f.descripcion}</span></>}</h1>

      <section className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {id === 0 && <Campo label="Código"><input value={f.codigo} onChange={(e) => cambia({ codigo: e.target.value.toUpperCase().replace(/\s/g, '_') })} maxLength={40} placeholder="LSD_CONCEPTOS" className={`${inputCls} font-mono`} /></Campo>}
        <Campo label="Descripción" className={id === 0 ? 'lg:col-span-2' : 'lg:col-span-3'}><input value={f.descripcion} onChange={(e) => cambia({ descripcion: e.target.value })} disabled={!puedeModificar} maxLength={150} className={inputCls} /></Campo>
        <Campo label="Cada fila del archivo sale de">
          <select value={f.tabla} onChange={(e) => cambia({ tabla: e.target.value as TablaExportador })} disabled={!puedeModificar} className={inputCls}>{TABLAS.map((t) => <option key={t.v} value={t.v}>{t.t} — {t.ayuda}</option>)}</select>
        </Campo>
        <Campo label="Formato del archivo">
          <select value={f.separador ?? ''} onChange={(e) => cambia({ separador: e.target.value || null })} disabled={!puedeModificar} className={inputCls}>{SEPARADORES.map((s) => <option key={s.v} value={s.v}>{s.t}</option>)}</select>
        </Campo>
        <Campo label="Codificación"><select value={f.codificacion} onChange={(e) => cambia({ codificacion: e.target.value as 'UTF8' | 'ANSI' })} disabled={!puedeModificar} className={inputCls}><option value="UTF8">UTF-8 (recomendada)</option><option value="ANSI">ANSI (Windows-1252)</option></select></Campo>
        <Campo label="Importes (decimales)"><select value={f.formatoDecimal} onChange={(e) => cambia({ formatoDecimal: e.target.value as FormatoDecimal })} disabled={!puedeModificar} className={inputCls}>{FORMATOS_DECIMAL.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}</select></Campo>
        <Campo label="Fechas"><input list="formatos-fecha" value={f.formatoFecha} onChange={(e) => cambia({ formatoFecha: e.target.value })} disabled={!puedeModificar} className={`${inputCls} font-mono`} /><datalist id="formatos-fecha">{FORMATOS_FECHA.map((x) => <option key={x} value={x} />)}</datalist></Campo>
        <div className="flex flex-col justify-end gap-2 pb-1 text-sm text-gray-700">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={f.conEncabezado && !fijo} disabled={fijo || !puedeModificar} onChange={(e) => cambia({ conEncabezado: e.target.checked })} /> Primera línea con los nombres de los campos</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={f.activo} disabled={!puedeModificar} onChange={(e) => cambia({ activo: e.target.checked })} /> Formato activo</label>
        </div>
        <Campo label="Solo exportar las filas donde esta fórmula sea verdadera (opcional)" className="sm:col-span-2 lg:col-span-3">
          <input value={f.formulaCondicion ?? ''} onChange={(e) => cambia({ formulaCondicion: e.target.value || null })} onFocus={() => setFoco({ tipo: 'condicion' })} disabled={!puedeModificar} placeholder="SUELDO_NETO > 0 AND CBU <> ''" className={`${inputCls} font-mono`} />
        </Campo>
        <Campo label="Nombre del archivo (opcional)" className="sm:col-span-2 lg:col-span-3">
          <textarea value={f.formulaArchivo ?? ''} onChange={(e) => cambia({ formulaArchivo: e.target.value || null })} onFocus={() => setFoco({ tipo: 'archivo' })} disabled={!puedeModificar} rows={2} spellCheck={false}
            placeholder={'"AR-" + EMPRESA_CUIT_NUMERICO + "-" + YEAR(LIQUIDACION_FECHA_HASTA) + ".txt"'} className={`${inputCls} font-mono`} />
          <p className="text-xs text-gray-400 mt-1">Con dos nombres separados por «;» (<code>"datos.txt;datos_" + MD5 + ".zip"</code>) el texto se entrega dentro de un zip; <code>MD5</code> es el del contenido. Sin fórmula se usa el código y la fecha.</p>
        </Campo>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800 text-sm">Campos del archivo <span className="font-normal text-gray-400">({f.campos.length})</span></h2>
            {puedeModificar && <BotonSecundario onClick={() => cambia({ campos: [...f.campos, { nombre: `Campo ${f.campos.length + 1}`, tipoDato: 'TEXTO', longitud: null, decimales: null, formatoDecimal: null, formula: null }] })} className="inline-flex items-center gap-1.5"><Plus size={14} /> Agregar campo</BotonSecundario>}
          </div>
          <div className="grid gap-2">
            {f.campos.map((c, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <span className="text-xs text-gray-400 w-5 pb-2">{i + 1}</span>
                  <Campo label="Nombre" className="w-44"><input value={c.nombre} onChange={(e) => setCampo(i, { nombre: e.target.value })} disabled={!puedeModificar} maxLength={60} className={inputCls} /></Campo>
                  <Campo label="Tipo" className="w-28"><select value={c.tipoDato} onChange={(e) => setCampo(i, { tipoDato: e.target.value as TipoDatoCampo })} disabled={!puedeModificar} className={inputCls}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}</select></Campo>
                  <Campo label={fijo ? 'Largo *' : 'Largo máx.'} className="w-20"><input type="number" min={1} value={c.longitud ?? ''} onChange={(e) => setCampo(i, { longitud: e.target.value === '' ? null : Number(e.target.value) })} disabled={!puedeModificar} className={`${inputCls} ${fijo && !c.longitud ? 'border-red-400' : ''}`} /></Campo>
                  {c.tipoDato === 'DECIMAL' && <>
                    <Campo label="Decimales" className="w-20"><input type="number" min={0} max={8} value={c.decimales ?? ''} placeholder="2" onChange={(e) => setCampo(i, { decimales: e.target.value === '' ? null : Number(e.target.value) })} disabled={!puedeModificar} className={inputCls} /></Campo>
                    <Campo label="Formato" className="w-40"><select value={c.formatoDecimal ?? ''} onChange={(e) => setCampo(i, { formatoDecimal: (e.target.value || null) as FormatoDecimal | null })} disabled={!puedeModificar} className={inputCls}><option value="">El del archivo</option>{FORMATOS_DECIMAL.map((x) => <option key={x.v} value={x.v}>{x.v.replace('_', ' ').toLowerCase()}</option>)}</select></Campo>
                  </>}
                  {puedeModificar && (
                    <div className="flex items-center gap-1 pb-2 ml-auto">
                      <button title="Subir" onClick={() => mover(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-blue-700 disabled:opacity-30"><ArrowUp size={15} /></button>
                      <button title="Bajar" onClick={() => mover(i, 1)} disabled={i === f.campos.length - 1} className="text-gray-400 hover:text-blue-700 disabled:opacity-30"><ArrowDown size={15} /></button>
                      <button title="Quitar el campo" onClick={() => { if (f.campos.length > 1) cambia({ campos: f.campos.filter((_, k) => k !== i) }) }} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                    </div>
                  )}
                </div>
                <textarea value={c.formula ?? ''} onChange={(e) => setCampo(i, { formula: e.target.value || null })} onFocus={() => setFoco({ tipo: 'campo', i })} disabled={!puedeModificar} rows={1} spellCheck={false}
                  placeholder="Fórmula del valor: LEGAJO, PADLEFT(LEGAJO,0,6), SUELDO_NETO * 100, #10..." className={`${inputCls} font-mono mt-2`} />
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
          <BotonPrimario onClick={() => { setMsg(null); guardar.mutate() }} disabled={guardar.isPending || (id > 0 && !sucio) || !f.descripcion.trim() || (id === 0 && !f.codigo.trim())}>{guardar.isPending ? 'Guardando…' : 'Guardar formato'}</BotonPrimario>
          {sucio && <span className="text-xs text-amber-700">Hay cambios sin guardar</span>}
          {id > 0 && tienePermiso(permisos, 'SLD', 'eliminar') && (
            <BotonSecundario onClick={() => { setMsg(null); preguntar(`¿Borrar el formato ${f.codigo}?`, () => borrar.mutate(), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} disabled={borrar.isPending} className="ml-auto inline-flex items-center gap-1.5 text-red-600"><Trash2 size={14} /> Borrar formato</BotonSecundario>
          )}
        </div>
      )}

      {id > 0 && <Ejecutar id={id} tabla={f.tabla} sucio={sucio} />}
    </div>
  )
}

/** Probar el formato con datos reales y bajar el archivo. */
function Ejecutar({ id, tabla, sucio }: { id: number; tabla: TablaExportador; sucio: boolean }) {
  const necesitaPeriodo = tabla === 'RECIBOS' || tabla === 'CONCEPTOS_RECIBO'
  const { data: liquidaciones } = useQuery({ queryKey: ['sueldos', 'liquidaciones'], queryFn: getLiquidaciones, enabled: necesitaPeriodo })
  const [idLiq, setIdLiq] = useState('')
  const [bajas, setBajas] = useState(false)
  const [omitir, setOmitir] = useState(false)
  const [vista, setVista] = useState<VistaExportacion | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const refPre = useRef<HTMLPreElement>(null)
  const filtro = () => ({ idLiquidacion: idLiq ? Number(idLiq) : undefined, incluirBajas: bajas, omitirConError: omitir })
  const listo = !necesitaPeriodo || !!idLiq

  const probar = useMutation({ mutationFn: () => vistaExportador(id, { ...filtro(), limite: 25 }), onSuccess: (v) => { setVista(v); setMsg(null) }, onError: (e) => { setVista(null); setMsg({ tipo: 'error', texto: mensajeDeError(e) }) } })
  const bajar = useMutation({
    mutationFn: () => bajarExportacion(id, filtro()),
    onSuccess: (nombre) => setMsg({ tipo: 'ok', texto: `Se generó el archivo ${nombre}.` }),
    onError: async (e) => setMsg({ tipo: 'error', texto: await mensajeDeBlob(e) }),
  })
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4 mt-8">
      <h2 className="font-semibold text-gray-800 mb-1">Probar y generar el archivo</h2>
      {sucio && <p className="text-xs text-amber-700 mb-2">Hay cambios sin guardar: se usa el formato guardado.</p>}
      <div className="flex flex-wrap items-end gap-3 mb-3">
        {necesitaPeriodo ? (
          <Campo label="Liquidación" className="w-64">
            <select value={idLiq} onChange={(e) => { setIdLiq(e.target.value); setVista(null) }} className={inputCls}>
              <option value="">— elegí la liquidación —</option>
              {liquidaciones?.map((l) => <option key={l.idLiquidacion} value={l.idLiquidacion}>{l.periodo} · {l.recibos} recibos</option>)}
            </select>
          </Campo>
        ) : <label className="inline-flex items-center gap-2 text-sm text-gray-700 pb-2"><input type="checkbox" checked={bajas} onChange={(e) => { setBajas(e.target.checked); setVista(null) }} /> Incluir empleados dados de baja</label>}
        <BotonSecundario onClick={() => { setMsg(null); probar.mutate() }} disabled={!listo || probar.isPending}>{probar.isPending ? 'Probando…' : 'Ver las primeras líneas'}</BotonSecundario>
        <BotonPrimario onClick={() => { setMsg(null); bajar.mutate() }} disabled={!listo || bajar.isPending} className="inline-flex items-center gap-1.5"><Download size={15} /> {bajar.isPending ? 'Generando…' : 'Generar archivo'}</BotonPrimario>
        <label className="inline-flex items-center gap-2 text-xs text-gray-500 pb-2"><input type="checkbox" checked={omitir} onChange={(e) => setOmitir(e.target.checked)} /> Omitir las filas con error</label>
      </div>
      {msg && <div className="mb-3"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      {vista && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            <b>{vista.filas}</b> {vista.filas === 1 ? 'línea' : 'líneas'}{vista.excluidas > 0 && <> · {vista.excluidas} afuera por la condición</>}
            {vista.conError > 0 && <> · <span className="text-red-600 font-medium">{vista.conError} con error</span></>}
            {vista.nombreArchivo && <> · archivo <span className="font-mono text-xs">{vista.nombreArchivo}</span></>}
          </p>
          {vista.errores.length > 0 && (
            <ul className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 space-y-0.5">
              {vista.errores.slice(0, 8).map((e, i) => <li key={i}><b>{e.fila}</b> · {e.campo}: {e.mensaje}</li>)}
              {vista.errores.length > 8 && <li>… y {vista.errores.length - 8} más</li>}
            </ul>
          )}
          <pre ref={refPre} className="bg-gray-900 text-green-200 text-xs rounded-lg p-3 overflow-x-auto max-h-80 leading-relaxed">{vista.lineas.join('\n') || '(el archivo no tiene líneas)'}</pre>
        </div>
      )}
    </section>
  )
}
