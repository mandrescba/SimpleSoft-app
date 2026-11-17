import { useCatalogos } from '../../hooks/useCatalogos'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Download, FileText } from 'lucide-react'
import { AGRUPACIONES, abrirLibroSueldos, bajarInforme, getInforme, getInformes, mensajeDeBlob, type ParamsInforme, type TablaInforme } from '../../api/informes'
import { getLiquidaciones } from '../../api/liquidaciones'
import { mensajeDeError } from '../../api/axios'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'

const ar = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function Tabla({ t }: { t: TablaInforme }) {
  const pag = usePaginado(t.filas)
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
          {t.columnas.map((c) => <th key={c.nombre} className={`px-3 py-2 font-medium ${c.tipo === 'texto' ? '' : 'text-right'}`}>{c.nombre}</th>)}
        </tr></thead>
        <tbody>
          {pag.filas.map((f, i) => (
            <tr key={i} className={`border-b border-gray-50 ${f.clase === 'total' ? 'bg-gray-100 font-bold' : f.clase === 'subtotal' ? 'bg-gray-50 font-semibold' : ''}`}>
              {f.celdas.map((v, j) => (
                <td key={j} className={`px-3 py-1.5 ${t.columnas[j].tipo === 'texto' ? '' : 'text-right tabular-nums'}`}>
                  {v === null ? '' : typeof v === 'number' && (t.columnas[j].tipo === 'dinero' || !Number.isInteger(v)) ? ar.format(v) : v}
                </td>
              ))}
            </tr>
          ))}
          {t.filas.length === 0 && <tr><td colSpan={t.columnas.length} className="px-4 py-8 text-center text-gray-400">No hay datos para esos parámetros</td></tr>}
        </tbody>
      </table>
      <Paginador pag={pag} />
    </div>
  )
}

/** Informes de sueldos: se elige el informe, se completan sus parámetros, se ve en pantalla y se baja en PDF o Excel. También el Libro de Sueldos. */
export default function InformesPage() {
  const cat = useCatalogos()
  const { data: informes } = useQuery({ queryKey: ['sueldos', 'informes'], queryFn: getInformes })
  const { data: liquidaciones } = useQuery({ queryKey: ['sueldos', 'liquidaciones'], queryFn: getLiquidaciones })
  const [codigo, setCodigo] = useState('')
  const [p, setP] = useState<ParamsInforme>({})
  const [modo, setModo] = useState<'liq' | 'fechas'>('liq')
  const [tabla, setTabla] = useState<TablaInforme | null>(null)
  const [usados, setUsados] = useState<ParamsInforme | null>(null)   // parámetros con los que se generó lo que se ve
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error' | 'aviso'; texto: string } | null>(null)
  const [libroLiq, setLibroLiq] = useState('')

  const info = informes?.find((i) => i.codigo === codigo)
  useEffect(() => { if (informes && !codigo) setCodigo(informes[0].codigo) }, [informes, codigo])
  useEffect(() => { setTabla(null); setUsados(null); setMsg(null); setModo(info?.usaLiquidacion ? 'liq' : 'fechas') }, [codigo]) // eslint-disable-line react-hooks/exhaustive-deps

  // los parámetros que se mandan son solo los que usa el informe elegido
  const efectivos = (): ParamsInforme => ({
    idLiquidacion: info?.usaLiquidacion && modo === 'liq' ? p.idLiquidacion : undefined,
    desde: info?.usaFechas && (modo === 'fechas' || !info.usaLiquidacion) ? p.desde : undefined,
    hasta: info?.usaFechas && (modo === 'fechas' || !info.usaLiquidacion) ? p.hasta : undefined,
    agrupar: info?.usaAgrupar ? p.agrupar : undefined,
    legajo: info?.usaLegajo ? p.legajo : undefined,
  })

  async function ver() {
    setMsg(null); setCargando(true)
    const pe = efectivos()
    try { setTabla(await getInforme(codigo, pe)); setUsados(pe) }
    catch (e) { setTabla(null); setUsados(null); setMsg({ tipo: 'error', texto: mensajeDeError(e) }) }
    finally { setCargando(false) }
  }
  async function bajar(f: 'pdf' | 'xlsx') {
    if (!usados) return
    try { await bajarInforme(codigo, usados, f) } catch (e) { setMsg({ tipo: 'error', texto: await mensajeDeBlob(e) }) }
  }
  async function libro() {
    setMsg(null)
    try { await abrirLibroSueldos(Number(libroLiq)) } catch (e) { setMsg({ tipo: 'error', texto: await mensajeDeBlob(e) }) }
  }

  const selectorLiq = (valor: number | undefined, cambiar: (v: number | undefined) => void) => (
    <select value={valor ?? ''} onChange={(e) => cambiar(e.target.value ? Number(e.target.value) : undefined)} className={inputCls}>
      <option value="">Elegí una liquidación…</option>
      {liquidaciones?.map((l) => <option key={l.idLiquidacion} value={l.idLiquidacion}>{l.periodo} · {l.tipo} · {cat.nombreEstado(l.estado).toLowerCase()}</option>)}
    </select>
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Informes</h1>
      <p className="text-gray-500 mb-4">Listados de las liquidaciones ya hechas. Se ven acá y se bajan en PDF o Excel.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <Campo label="Informe" className="sm:col-span-2">
            <select value={codigo} onChange={(e) => setCodigo(e.target.value)} className={inputCls}>
              {informes?.map((i) => <option key={i.codigo} value={i.codigo}>{i.nombre}</option>)}
            </select>
          </Campo>
          <div className="text-xs text-gray-500">{info?.descripcion}</div>

          {info?.usaLiquidacion && info.usaFechas && (
            <Campo label="Alcance">
              <select value={modo} onChange={(e) => setModo(e.target.value as 'liq' | 'fechas')} className={inputCls}>
                <option value="liq">Una liquidación</option><option value="fechas">Rango de fechas</option>
              </select>
            </Campo>
          )}
          {info?.usaLiquidacion && (modo === 'liq' || !info.usaFechas) && <Campo label="Liquidación">{selectorLiq(p.idLiquidacion, (v) => setP({ ...p, idLiquidacion: v }))}</Campo>}
          {info?.usaFechas && (modo === 'fechas' || !info.usaLiquidacion) && (
            <>
              <Campo label="Desde (fecha del recibo)"><input type="date" value={p.desde ?? ''} onChange={(e) => setP({ ...p, desde: e.target.value })} className={inputCls} /></Campo>
              <Campo label="Hasta"><input type="date" value={p.hasta ?? ''} onChange={(e) => setP({ ...p, hasta: e.target.value })} className={inputCls} /></Campo>
            </>
          )}
          {info?.usaAgrupar && (
            <Campo label="Agrupar por">
              <select value={p.agrupar ?? ''} onChange={(e) => setP({ ...p, agrupar: e.target.value })} className={inputCls}>
                <option value="">Elegí…</option>{AGRUPACIONES.map((a) => <option key={a.valor} value={a.valor}>{a.label}</option>)}
              </select>
            </Campo>
          )}
          {info?.usaLegajo && <Campo label="Legajo"><input value={p.legajo ?? ''} onChange={(e) => setP({ ...p, legajo: e.target.value })} className={inputCls} /></Campo>}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <BotonPrimario onClick={ver} disabled={cargando || !info}>{cargando ? 'Generando…' : 'Ver informe'}</BotonPrimario>
          <BotonSecundario onClick={() => bajar('pdf')} disabled={!usados} className="inline-flex items-center gap-1.5"><FileText size={14} /> PDF</BotonSecundario>
          <BotonSecundario onClick={() => bajar('xlsx')} disabled={!usados} className="inline-flex items-center gap-1.5"><Download size={14} /> Excel</BotonSecundario>
        </div>
      </div>

      {msg && <div className="mb-4"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      {tabla && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800">{tabla.titulo}</h2>
          {tabla.subtitulo && <p className="text-sm text-gray-500 mb-2">{tabla.subtitulo}</p>}
          <Tabla t={tabla} />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-gray-800 inline-flex items-center gap-2 mb-1"><BookOpen size={18} /> Libro de Sueldos</h2>
        <p className="text-sm text-gray-500 mb-3">Art. 52 de la Ley de Contrato de Trabajo: todos los recibos de una liquidación, con hojas numeradas, listos para imprimir.</p>
        <div className="flex flex-wrap items-end gap-2">
          <Campo label="Liquidación" className="min-w-64">{selectorLiq(libroLiq ? Number(libroLiq) : undefined, (v) => setLibroLiq(v ? String(v) : ''))}</Campo>
          <BotonPrimario onClick={libro} disabled={!libroLiq}>Abrir el libro (PDF)</BotonPrimario>
        </div>
      </div>
    </div>
  )
}
