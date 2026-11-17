import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronDown, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react'
import {
  TIPOS_IMPORTACION, bajarPlantilla, getColumnas, getFormatoImport, getHojas, importarDatos, validarImport,
  type ColumnasImport, type DefinicionImport, type FilaImport, type HojaExcel, type OpcionesImport, type ResultadoImport,
} from '../../api/importar'
import { mensajeDeError } from '../../api/axios'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'

/** Letra de columna de Excel (0 → A, 26 → AA). */
const letra = (i: number): string => (i < 26 ? '' : letra(Math.floor(i / 26) - 1)) + String.fromCharCode(65 + (i % 26))
const TIPO_LABEL: Record<string, string> = { texto: 'Texto', numero: 'Número', entero: 'Número entero', fecha: 'Fecha', lista: 'Lista' }

/** Importación masiva desde Excel (empleados y novedades), en pasos: formato → archivo → hoja → columnas → revisión → importar. */
export default function ImportarPage() {
  const { tipo = 'empleados' } = useParams()
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800">Importar desde Excel</h1>
      <p className="text-gray-500 mb-4">Cargá muchos registros de una sola vez: bajá la plantilla, completala y subila.</p>
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {TIPOS_IMPORTACION.map((t) => (
          <NavLink key={t.tipo} to={`/sueldos/importar/${t.tipo}`}
            className={({ isActive }) => `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${isActive ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </NavLink>
        ))}
      </div>
      <Importador key={tipo} tipo={tipo} />
    </div>
  )
}

function Paso({ n, titulo, hecho, children }: { n: number; titulo: string; hecho?: boolean; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
      <h2 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs text-white ${hecho ? 'bg-green-600' : 'bg-blue-700'}`}>{hecho ? '✓' : n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Importador({ tipo }: { tipo: string }) {
  const qc = useQueryClient()
  const inputArchivo = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [hojas, setHojas] = useState<HojaExcel[] | null>(null)
  const [hoja, setHoja] = useState('')
  const [filaEnc, setFilaEnc] = useState(1)
  const [columnas, setColumnas] = useState<ColumnasImport | null>(null)
  const [mapeo, setMapeo] = useState<Record<string, number | undefined>>({})
  const [opciones, setOpciones] = useState<OpcionesImport>({ existentes: 'omitir', periodo: '' })
  const [revision, setRevision] = useState<ResultadoImport | null>(null)
  const [final, setFinal] = useState<ResultadoImport | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const [error, setError] = useState('')
  const [arrastrando, setArrastrando] = useState(false)

  const formato = useQuery({ queryKey: ['importar', 'formato', tipo], queryFn: () => getFormatoImport(tipo) })
  const def = formato.data?.definicion

  const plantilla = useMutation({ mutationFn: () => bajarPlantilla(tipo), onError: () => setError('No se pudo descargar la plantilla.') })

  const reiniciar = () => { setHojas(null); setHoja(''); setColumnas(null); setMapeo({}); setRevision(null); setFinal(null); setConfirmar(false); setError('') }

  const leerHojas = useMutation({
    mutationFn: (f: File) => getHojas(f),
    onSuccess: (hs) => {
      setHojas(hs)
      const con = hs.filter((h) => h.filas > 0)
      if (con.length === 1) setHoja(con[0].nombre)   // una sola hoja con datos: se elige sola
      if (hs.length === 0) setError('El archivo no tiene hojas visibles.')
    },
    onError: (e) => setError(mensajeDeError(e, 'No se pudo leer el archivo.')),
  })

  const leerColumnas = useMutation({
    mutationFn: (p: { f: File; hoja: string; fila: number }) => getColumnas(tipo, p.f, p.hoja, p.fila),
    onSuccess: (c) => { setColumnas(c); setMapeo(c.sugerido); setRevision(null); setFinal(null); setError('') },
    onError: (e) => { setColumnas(null); setError(mensajeDeError(e, 'No se pudo leer la hoja.')) },
  })

  // al elegir hoja o cambiar la fila de títulos se vuelven a leer las columnas
  useEffect(() => {
    if (!archivo || !hoja) return
    const t = setTimeout(() => leerColumnas.mutate({ f: archivo, hoja, fila: filaEnc }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivo, hoja, filaEnc])

  const mapeoLimpio = useMemo(() => Object.fromEntries(Object.entries(mapeo).filter(([, v]) => v !== undefined)) as Record<string, number>, [mapeo])

  const validar = useMutation({
    mutationFn: () => validarImport(tipo, archivo!, hoja, filaEnc, mapeoLimpio, opciones),
    onSuccess: (r) => { setRevision(r); setConfirmar(false); setError('') },
    onError: (e) => { setRevision(null); setError(mensajeDeError(e, 'No se pudo validar el archivo.')) },
  })

  const importar = useMutation({
    mutationFn: () => importarDatos(tipo, archivo!, hoja, filaEnc, mapeoLimpio, opciones),
    onSuccess: (r) => { setFinal(r); setConfirmar(false); setError(''); qc.invalidateQueries({ queryKey: ['sueldos', 'empleados'] }) },
    onError: (e) => { setConfirmar(false); setError(mensajeDeError(e, 'No se pudo importar el archivo.')) },
  })

  function elegirArchivo(f: File | undefined | null) {
    if (!f) return
    reiniciar()
    setArchivo(f)
    leerHojas.mutate(f)
  }

  // qué columnas obligatorias faltan mapear (en una actualización, apellido y nombre no hacen falta)
  const faltan = (def?.columnas ?? []).filter((c) => c.obligatoria && mapeo[c.clave] === undefined
    && !(tipo === 'empleados' && opciones.existentes === 'actualizar' && (c.clave === 'apellido' || c.clave === 'nombre')))
  const esNovedades = tipo.startsWith('novedades')
  const necesitaPeriodo = esNovedades && mapeo['periodo'] === undefined
  // en el formato por columnas hay que indicar al menos una columna de novedad
  const sinNovedad = tipo === 'novedades-columnas' && !Object.entries(mapeo).some(([k, v]) => k.startsWith('nov:') && v !== undefined)
  const periodoOk = !necesitaPeriodo || /^(0?[1-9]|1[0-2])\/\d{4}$/.test((opciones.periodo ?? '').trim())
  const puedeValidar = !!columnas && faltan.length === 0 && periodoOk && !sinNovedad

  // cualquier cambio en las columnas o las opciones invalida la revisión hecha
  const cambiaMapeo = (clave: string, valor: string) => { setMapeo((m) => ({ ...m, [clave]: valor === '' ? undefined : Number(valor) })); setRevision(null); setFinal(null) }
  const cambiaOpciones = (o: Partial<OpcionesImport>) => { setOpciones((p) => ({ ...p, ...o })); setRevision(null); setFinal(null) }

  return (
    <div>
      {formato.isError && <Mensaje tipo="error">{mensajeDeError(formato.error)}</Mensaje>}
      {def && <PasoFormato def={def} referencias={formato.data!.referencias} descargando={plantilla.isPending} onDescargar={() => plantilla.mutate()} />}

      <Paso n={2} titulo="Subí tu archivo" hecho={!!archivo && !!hojas}>
        <div
          onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }} onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastrando(false); elegirArchivo(e.dataTransfer.files[0]) }}
          onClick={() => inputArchivo.current?.click()}
          className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${arrastrando ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>
          {archivo ? <FileSpreadsheet className="text-green-700" size={28} /> : <Upload className="text-gray-400" size={28} />}
          <p className="text-sm text-gray-700 font-medium">{archivo ? archivo.name : 'Arrastrá el archivo acá o hacé clic para elegirlo'}</p>
          <p className="text-xs text-gray-400">{archivo ? `${(archivo.size / 1024).toFixed(0)} KB · hacé clic para cambiarlo` : 'Libro de Excel (.xlsx), hasta 8 MB y 5.000 filas'}</p>
          <input ref={inputArchivo} type="file" accept=".xlsx" className="hidden" onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = '' }} />
        </div>
        {leerHojas.isPending && <p className="text-sm text-gray-500 mt-3">Leyendo el archivo…</p>}
      </Paso>

      {error && <div className="mb-4"><Mensaje tipo="error">{error}</Mensaje></div>}

      {hojas && hojas.length > 0 && (
        <Paso n={3} titulo="Elegí la hoja" hecho={!!columnas}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hojas.map((h) => (
              <button key={h.nombre} type="button" disabled={h.filas === 0} onClick={() => setHoja(h.nombre)}
                className={`text-left border rounded-xl p-3 transition-colors disabled:opacity-50 ${hoja === h.nombre ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-gray-800 truncate">{h.nombre}</span>
                  <span className="text-xs text-gray-400 shrink-0">{h.filas === 0 ? 'vacía' : `${h.filas} filas`}</span>
                </div>
                <MiniVista vista={h.vista} />
              </button>
            ))}
          </div>
          {hoja && (
            <div className="mt-4 flex items-end gap-4">
              <Campo label="Fila donde están los títulos de las columnas" className="w-72">
                <input type="number" min={1} max={100} value={filaEnc} onChange={(e) => setFilaEnc(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
              </Campo>
              <p className="text-xs text-gray-400 pb-2">Las filas que siguen se toman como datos. Normalmente es la fila 1.</p>
            </div>
          )}
          {leerColumnas.isPending && <p className="text-sm text-gray-500 mt-3">Leyendo la hoja…</p>}
        </Paso>
      )}

      {columnas && def && (
        <Paso n={4} titulo="Indicá qué columna es cada dato" hecho={!!revision}>
          <p className="text-sm text-gray-500 mb-3">
            Se encontraron <b>{columnas.totalFilas}</b> filas con datos. Reconocimos las columnas por su nombre; revisá la correspondencia y corregila si hace falta.
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 bg-gray-50"><th className="px-3 py-2 font-medium">Dato del sistema</th><th className="px-3 py-2 font-medium">Columna de tu archivo</th><th className="px-3 py-2 font-medium w-10" /></tr></thead>
              <tbody>
                {def.columnas.map((c) => {
                  const m = mapeo[c.clave]
                  const falta = c.obligatoria && m === undefined && !(tipo === 'empleados' && opciones.existentes === 'actualizar' && (c.clave === 'apellido' || c.clave === 'nombre'))
                  return (
                    <tr key={c.clave} className="border-t border-gray-100">
                      <td className="px-3 py-1.5">{c.titulo}{c.obligatoria && <span className="ml-1 text-xs text-red-600">obligatoria</span>}</td>
                      <td className="px-3 py-1.5">
                        <select value={m ?? ''} onChange={(e) => cambiaMapeo(c.clave, e.target.value)} className={`${inputCls} py-1 ${falta ? 'border-red-400' : ''}`}>
                          <option value="">— no importar —</option>
                          {columnas.encabezados.map((h, i) => <option key={i} value={i}>{letra(i)} · {h || '(sin título)'}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">{m !== undefined ? <CheckCircle2 size={16} className="text-green-600" /> : falta ? <XCircle size={16} className="text-red-500" /> : null}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {columnas.muestra.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-blue-700">Ver las primeras filas del archivo</summary>
              <div className="overflow-x-auto mt-2 border border-gray-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead><tr className="bg-gray-50 text-left">{columnas.encabezados.map((h, i) => <th key={i} className="px-2 py-1 font-medium whitespace-nowrap">{letra(i)} · {h}</th>)}</tr></thead>
                  <tbody>{columnas.muestra.map((f, r) => <tr key={r} className="border-t border-gray-100">{f.map((v, i) => <td key={i} className="px-2 py-1 whitespace-nowrap">{v}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </details>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {tipo === 'empleados' && (
              <Campo label="Si el legajo ya existe">
                <select value={opciones.existentes} onChange={(e) => cambiaOpciones({ existentes: e.target.value as OpcionesImport['existentes'] })} className={inputCls}>
                  <option value="omitir">Omitir la fila (no tocar al empleado)</option>
                  <option value="actualizar">Actualizar solo los datos que completé</option>
                </select>
              </Campo>
            )}
            {necesitaPeriodo && (
              <Campo label="Período de las novedades (MM/AAAA)" error={opciones.periodo && !periodoOk ? 'Usá el formato MM/AAAA, por ejemplo 03/2026.' : undefined}>
                <input value={opciones.periodo ?? ''} onChange={(e) => cambiaOpciones({ periodo: e.target.value })} placeholder="03/2026" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Tu archivo no tiene columna Período: todas las filas se cargan en este mes.</p>
              </Campo>
            )}
          </div>

          {faltan.length > 0 && <div className="mt-4"><Mensaje tipo="aviso">Falta indicar: {faltan.map((c) => c.titulo).join(', ')}.</Mensaje></div>}
          {sinNovedad && <div className="mt-4"><Mensaje tipo="aviso">Indicá al menos una columna de novedad (por ejemplo, las horas extras).</Mensaje></div>}
          <div className="mt-4">
            <BotonPrimario disabled={!puedeValidar || validar.isPending} onClick={() => validar.mutate()}>{validar.isPending ? 'Revisando…' : 'Revisar el archivo'}</BotonPrimario>
            <span className="ml-3 text-xs text-gray-400">Todavía no se guarda nada.</span>
          </div>
        </Paso>
      )}

      {revision && !final && (
        <Paso n={5} titulo="Revisá y confirmá" hecho={false}>
          <Resumen r={revision} tipo={tipo} />
          <TablaFilas filas={revision.filas} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!confirmar ? (
              <BotonPrimario disabled={revision.validas === 0} onClick={() => setConfirmar(true)}>
                Importar {revision.validas} {revision.validas === 1 ? 'fila' : 'filas'}
              </BotonPrimario>
            ) : (
              <>
                <BotonPrimario disabled={importar.isPending} onClick={() => importar.mutate()}>{importar.isPending ? 'Importando…' : 'Sí, importar ahora'}</BotonPrimario>
                <BotonSecundario disabled={importar.isPending} onClick={() => setConfirmar(false)}>Cancelar</BotonSecundario>
              </>
            )}
            {revision.conErrores > 0 && <span className="text-sm text-amber-700">Las {revision.conErrores} filas con errores no se importan: corregilas en el Excel y volvé a subirlo.</span>}
          </div>
        </Paso>
      )}

      {final && (
        <Paso n={5} titulo="Importación terminada" hecho>
          <Mensaje tipo={final.importadas > 0 ? 'ok' : 'aviso'}>
            Se importaron <b>{final.importadas}</b> de {final.total} filas
            {final.conErrores > 0 && <> · {final.conErrores} con errores</>}
            {final.omitidas > 0 && <> · {final.omitidas} omitidas</>}.
          </Mensaje>
          {final.filas.some((f) => f.estado !== 'ok') && <TablaFilas filas={final.filas.filter((f) => f.estado !== 'ok')} />}
          <div className="mt-4 flex gap-3">
            <BotonSecundario onClick={() => { setArchivo(null); reiniciar() }}>Importar otro archivo</BotonSecundario>
            {tipo === 'empleados' && <Link to="/sueldos/empleados" className="inline-flex items-center border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm">Ver empleados</Link>}
          </div>
        </Paso>
      )}
    </div>
  )
}

/** Primer paso: el formato de columnas (siempre a la vista) y la descarga de la plantilla. */
function PasoFormato({ def, referencias, descargando, onDescargar }: { def: DefinicionImport; referencias: { nombre: string; ayuda: string; encabezados: string[]; filas: string[][] }[]; descargando: boolean; onDescargar: () => void }) {
  const [abierto, setAbierto] = useState(true)
  return (
    <Paso n={1} titulo="Armá el Excel con este formato">
      <p className="text-sm text-gray-600">{def.indicaciones}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <BotonPrimario onClick={onDescargar} disabled={descargando} className="inline-flex items-center gap-1.5"><Download size={16} /> {descargando ? 'Generando…' : 'Descargar plantilla de Excel'}</BotonPrimario>
        <span className="text-xs text-gray-400">Trae instrucciones, una hoja para completar, un ejemplo y los códigos válidos de tu empresa.</span>
      </div>
      <button type="button" onClick={() => setAbierto(!abierto)} className="mt-4 inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
        <ChevronDown size={14} className={`transition-transform ${abierto ? '' : '-rotate-90'}`} /> {abierto ? 'Ocultar' : 'Ver'} las columnas del formato
      </button>
      {abierto && (
        <div className="mt-2 border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 bg-gray-50">
              <th className="px-3 py-2 font-medium">Columna</th><th className="px-3 py-2 font-medium">Obligatoria</th><th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Qué lleva</th><th className="px-3 py-2 font-medium">Ejemplo</th>
            </tr></thead>
            <tbody>
              {def.columnas.map((c) => (
                <tr key={c.clave} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap">{c.titulo}</td>
                  <td className="px-3 py-1.5">{c.obligatoria ? <span className="text-red-600 font-medium">Sí</span> : <span className="text-gray-400">No</span>}</td>
                  <td className="px-3 py-1.5 text-gray-500">{TIPO_LABEL[c.tipo] ?? c.tipo}</td>
                  <td className="px-3 py-1.5 text-gray-600">{c.descripcion}{c.valores && <span className="block text-xs text-gray-400">Valores: {c.valores.join(', ')}</span>}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-gray-500 whitespace-nowrap">{c.ejemplo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {abierto && referencias.some((r) => r.filas.length > 0) && (
        <p className="mt-2 text-xs text-gray-400">Los códigos válidos de tu empresa ({referencias.filter((r) => r.filas.length > 0).map((r) => r.nombre.toLowerCase()).join(', ')}) vienen en la hoja «Referencias» de la plantilla.</p>
      )}
    </Paso>
  )
}

function MiniVista({ vista }: { vista: string[][] }) {
  if (vista.length === 0) return <p className="text-xs text-gray-300 mt-2">Sin datos</p>
  return (
    <div className="mt-2 overflow-hidden rounded border border-gray-100 text-[10px] leading-tight text-gray-500">
      {vista.slice(0, 4).map((f, r) => (
        <div key={r} className={`flex ${r === 0 ? 'bg-gray-50 font-medium' : ''}`}>
          {f.slice(0, 4).map((v, i) => <span key={i} className="flex-1 min-w-0 truncate px-1 py-0.5 border-r border-gray-100 last:border-0">{v || ' '}</span>)}
        </div>
      ))}
    </div>
  )
}

function Resumen({ r, tipo }: { r: ResultadoImport; tipo: string }) {
  const tile = (valor: number, label: string, cls: string) => (
    <div className={`rounded-xl border px-4 py-2 ${cls}`}><div className="text-xl font-bold tabular-nums">{valor}</div><div className="text-xs">{label}</div></div>
  )
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {tile(r.total, 'filas leídas', 'border-gray-200 text-gray-700')}
      {tile(r.validas, tipo === 'empleados' ? `listas (${r.aCrear} altas, ${r.aActualizar} actualizaciones)` : 'listas para cargar', 'border-green-200 bg-green-50 text-green-700')}
      {tile(r.conErrores, 'con errores', r.conErrores > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 text-gray-400')}
      {r.omitidas > 0 && tile(r.omitidas, 'omitidas (ya existen)', 'border-amber-200 bg-amber-50 text-amber-700')}
    </div>
  )
}

type Filtro = 'todas' | 'error' | 'ok' | 'omitida'

function TablaFilas({ filas }: { filas: FilaImport[] }) {
  const hayErrores = filas.some((f) => f.estado === 'error')
  const [filtro, setFiltro] = useState<Filtro>(hayErrores ? 'error' : 'todas')
  const visibles = useMemo(() => (filtro === 'todas' ? filas : filas.filter((f) => f.estado === filtro)), [filas, filtro])
  const pag = usePaginado(visibles)
  const chip = (f: Filtro, label: string) => (
    <button key={f} type="button" onClick={() => setFiltro(f)} className={`px-3 py-1 rounded-full text-xs border ${filtro === f ? 'bg-blue-700 border-blue-700 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{label}</button>
  )
  return (
    <div>
      <div className="flex gap-2 mb-2">
        {chip('todas', `Todas (${filas.length})`)}
        {chip('error', `Con errores (${filas.filter((f) => f.estado === 'error').length})`)}
        {chip('ok', `Correctas (${filas.filter((f) => f.estado === 'ok').length})`)}
        {filas.some((f) => f.estado === 'omitida') && chip('omitida', `Omitidas (${filas.filter((f) => f.estado === 'omitida').length})`)}
      </div>
      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 bg-gray-50">
            <th className="px-3 py-2 font-medium w-16">Fila</th><th className="px-3 py-2 font-medium">Detalle</th><th className="px-3 py-2 font-medium">Qué pasa</th><th className="px-3 py-2 font-medium">Observaciones</th>
          </tr></thead>
          <tbody>
            {pag.filas.map((f) => (
              <tr key={f.fila} className="border-t border-gray-100 align-top">
                <td className="px-3 py-1.5 text-gray-400 tabular-nums">{f.fila}</td>
                <td className="px-3 py-1.5">{f.etiqueta || <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {f.estado === 'ok' && <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={14} /> {f.accion === 'crear' ? 'Alta' : f.accion === 'actualizar' ? 'Actualiza' : 'Carga'}</span>}
                  {f.estado === 'error' && <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={14} /> Error</span>}
                  {f.estado === 'omitida' && <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle size={14} /> Omitida</span>}
                </td>
                <td className="px-3 py-1.5 text-gray-600">{f.mensajes.map((m, i) => <div key={i}>{m}</div>)}</td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={4} className="px-3 py-5 text-center text-gray-400">No hay filas en esta vista</td></tr>}
          </tbody>
        </table>
        <Paginador pag={pag} />
      </div>
    </div>
  )
}
