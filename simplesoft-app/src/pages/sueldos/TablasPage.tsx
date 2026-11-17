import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardPaste, Plus, Trash2, X } from 'lucide-react'
import { crearTabla, eliminarTabla, getTabla, getTablas, guardarTabla, type ColumnaTabla, type TipoDatoTabla } from '../../api/configuracion'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import Modal from '../../components/ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { preguntar } from '../../components/ui/Confirmar'

const TIPOS: { v: TipoDatoTabla; t: string }[] = [
  { v: 'TEXTO', t: 'Texto' }, { v: 'ENTERO', t: 'Entero' }, { v: 'DECIMAL', t: 'Decimal' }, { v: 'FECHA', t: 'Fecha' }, { v: 'LOGICO', t: 'Sí / No' },
]
const MAX_COLUMNAS = 9

function NuevaTabla({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const crear = useMutation({
    // arranca con una columna: las demás se agregan en la pantalla de la tabla
    mutationFn: () => crearTabla({ codigo, descripcion, columnas: [{ nombre: 'Columna 1', tipoDato: 'TEXTO', longitud: null, decimales: null }], filas: [] }),
    onSuccess: (t) => { qc.invalidateQueries({ queryKey: ['sueldos', 'tablas'] }); navigate(`/sueldos/tablas/${t.idTabla}`) },
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <Modal titulo="Nueva tabla" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); crear.mutate() }} className="grid gap-4">
        <Campo label="Código">
          <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, '_'))} maxLength={40} placeholder="ANTIGUEDAD_TABLA" className={`${inputCls} font-mono`} />
          <p className="text-xs text-gray-400 mt-1">Es el nombre que se usa en las fórmulas: <code>TABLA(CODIGO, condición, resultado)</code>. No se puede cambiar después.</p>
        </Campo>
        <Campo label="Descripción (opcional)"><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={150} className={inputCls} /></Campo>
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <div className="flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={crear.isPending || !codigo.trim()}>{crear.isPending ? 'Creando…' : 'Crear'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Tablas de datos de la empresa (escalas de antigüedad, mínimos no imponibles de Ganancias...). */
export function TablasPage() {
  const puedeCrear = tienePermiso(permisosDelToken(useAuthStore((s) => s.token)), 'SLD', 'crear')
  const [nueva, setNueva] = useState(false)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'tablas'], queryFn: getTablas })
  const pag = usePaginado(data)
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tablas</h1>
          <p className="text-gray-500">Datos que consultan las fórmulas: escalas de antigüedad, mínimos no imponibles, escalas de Ganancias.</p>
        </div>
        {puedeCrear && <BotonPrimario onClick={() => setNueva(true)} className="inline-flex items-center gap-1.5 shrink-0"><Plus size={16} /> Nueva tabla</BotonPrimario>}
      </div>
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Tabla</th><th className="px-4 py-2 font-medium">Descripción</th><th className="px-4 py-2 font-medium text-right">Columnas</th><th className="px-4 py-2 font-medium text-right">Filas</th>
            </tr></thead>
            <tbody>
              {pag.filas.map((t) => (
                <tr key={t.idTabla} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs"><Link to={`/sueldos/tablas/${t.idTabla}`} className="text-blue-700 hover:underline">{t.codigo}</Link></td>
                  <td className="px-4 py-2">{t.descripcion}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{t.columnas}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-500">{t.filas}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Todavía no hay tablas</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
      {nueva && <NuevaTabla onClose={() => setNueva(false)} />}
    </div>
  )
}

function PegarDeExcel({ columnas, onAgregar, onClose }: { columnas: number; onAgregar: (filas: string[][]) => void; onClose: () => void }) {
  const [texto, setTexto] = useState('')
  const [conTitulos, setConTitulos] = useState(false)
  const filas = texto.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '').map((l) => l.split('\t'))
  const validas = conTitulos ? filas.slice(1) : filas
  const sobran = validas.some((f) => f.length > columnas)
  return (
    <Modal titulo="Pegar filas desde Excel" onClose={onClose} ancho="max-w-2xl">
      <p className="text-sm text-gray-600 mb-2">Copiá las celdas en Excel (sin dejar filas vacías) y pegalas acá. Se agregan al final de la tabla; cada columna de Excel va a la columna de la tabla en el mismo orden.</p>
      <textarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} spellCheck={false} className={`${inputCls} font-mono text-xs`} placeholder="Pegá acá…" />
      <label className="inline-flex items-center gap-2 text-sm text-gray-600 mt-2"><input type="checkbox" checked={conTitulos} onChange={(e) => setConTitulos(e.target.checked)} /> La primera fila son títulos (no se importa)</label>
      {sobran && <div className="mt-2"><Mensaje tipo="aviso">Pegaste más columnas de las que tiene la tabla ({columnas}): las que sobran se descartan.</Mensaje></div>}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-500">{validas.length} filas para agregar</span>
        <div className="flex gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="button" disabled={validas.length === 0} onClick={() => { onAgregar(validas.map((f) => Array.from({ length: columnas }, (_, i) => f[i]?.trim() ?? ''))); onClose() }}>Agregar filas</BotonPrimario>
        </div>
      </div>
    </Modal>
  )
}

/** Una tabla: su descripción, sus columnas (hasta 9) y sus filas, que se editan como en una planilla. */
export function TablaPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const puedeModificar = tienePermiso(permisos, 'SLD', 'modificar')
  const { data, isLoading } = useQuery({ queryKey: ['sueldos', 'tabla', id], queryFn: () => getTabla(id) })
  const [descripcion, setDescripcion] = useState('')
  const [cols, setCols] = useState<ColumnaTabla[]>([])
  const [filas, setFilas] = useState<string[][]>([])
  const [sucio, setSucio] = useState(false)
  const [pegar, setPegar] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    if (!data) return
    setDescripcion(data.descripcion)
    setCols(data.columnas.map((c) => ({ ...c })))
    setFilas(data.filas.map((f) => f.map((v) => v ?? '')))
    setSucio(false)
  }, [data])

  const guardar = useMutation({
    mutationFn: () => guardarTabla(id, {
      codigo: data!.codigo, descripcion,
      columnas: cols.map((c) => ({ nombre: c.nombre, tipoDato: c.tipoDato, longitud: null, decimales: null })),
      filas: filas.map((f) => f.map((v) => (v.trim() === '' ? null : v))),
    }),
    onSuccess: () => { setMsg({ tipo: 'ok', texto: 'Tabla guardada.' }); qc.invalidateQueries({ queryKey: ['sueldos', 'tabla', id] }); qc.invalidateQueries({ queryKey: ['sueldos', 'tablas'] }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const borrar = useMutation({
    mutationFn: () => eliminarTabla(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'tablas'] }); navigate('/sueldos/tablas', { replace: true }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  const cambia = () => { setSucio(true); setMsg(null) }
  const setCol = (i: number, c: Partial<ColumnaTabla>) => { setCols(cols.map((x, k) => (k === i ? { ...x, ...c } : x))); cambia() }
  const agregarColumna = () => { setCols([...cols, { nombre: `Columna ${cols.length + 1}`, tipoDato: 'TEXTO', longitud: null, decimales: null }]); setFilas(filas.map((f) => [...f, ''])); cambia() }
  const quitarColumna = (i: number) => {
    preguntar(`¿Quitar la columna «${cols[i].nombre}»? Las fórmulas que usen las columnas siguientes (COL${i + 2}…) tendrán que cambiarse.`, () => {
      setCols(cols.filter((_, k) => k !== i)); setFilas(filas.map((f) => f.filter((_, k) => k !== i))); cambia()
    }, { titulo: 'Quitar columna', boton: 'Quitar', peligro: true })
  }
  const setCelda = (r: number, c: number, v: string) => { setFilas(filas.map((f, k) => (k === r ? f.map((x, j) => (j === c ? v : x)) : f))); cambia() }

  if (isLoading) return <p className="text-sm text-gray-500">Cargando…</p>
  if (!data) return <Mensaje tipo="error">No se encontró la tabla.</Mensaje>
  return (
    <div>
      <Link to="/sueldos/tablas" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 mb-2"><ArrowLeft size={14} /> Tablas</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-1 font-mono">{data.codigo}</h1>
      <p className="text-sm text-gray-500 mb-4">En las fórmulas: <code className="bg-gray-100 px-1 rounded">TABLA({data.codigo}, condición, resultado)</code>. Cada columna se nombra <code className="bg-gray-100 px-1 rounded">COL1</code>, <code className="bg-gray-100 px-1 rounded">COL2</code>… según su orden.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <Campo label="Descripción" className="max-w-xl mb-4"><input value={descripcion} onChange={(e) => { setDescripcion(e.target.value); cambia() }} disabled={!puedeModificar} maxLength={150} className={inputCls} /></Campo>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Columnas</h2>
        <div className="grid gap-2">
          {cols.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="w-14 text-xs font-mono text-gray-400">COL{i + 1}</span>
              <input value={c.nombre} onChange={(e) => setCol(i, { nombre: e.target.value })} disabled={!puedeModificar} maxLength={40} className={`${inputCls} max-w-56`} />
              <select value={c.tipoDato} onChange={(e) => setCol(i, { tipoDato: e.target.value as TipoDatoTabla })} disabled={!puedeModificar} className={`${inputCls} max-w-36`}>
                {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
              </select>
              {puedeModificar && cols.length > 1 && <button title="Quitar la columna" onClick={() => quitarColumna(i)} className="text-red-400 hover:text-red-600"><X size={16} /></button>}
            </div>
          ))}
        </div>
        {puedeModificar && cols.length < MAX_COLUMNAS && <button onClick={agregarColumna} className="mt-2 inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"><Plus size={14} /> Agregar columna</button>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-sm font-semibold text-gray-700">Filas <span className="font-normal text-gray-400">({filas.length})</span></h2>
        {puedeModificar && (
          <div className="flex gap-2">
            <BotonSecundario onClick={() => setPegar(true)} className="inline-flex items-center gap-1.5"><ClipboardPaste size={14} /> Pegar desde Excel</BotonSecundario>
            <BotonSecundario onClick={() => { setFilas([...filas, cols.map(() => '')]); cambia() }} className="inline-flex items-center gap-1.5"><Plus size={14} /> Agregar fila</BotonSecundario>
          </div>
        )}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-2 py-2 font-medium w-10">#</th>
            {cols.map((c, i) => <th key={i} className="px-2 py-2 font-medium">COL{i + 1} · {c.nombre}</th>)}
            <th className="px-2 py-2 w-8" />
          </tr></thead>
          <tbody>
            {filas.map((f, r) => (
              <tr key={r} className="border-b border-gray-50 last:border-0">
                <td className="px-2 py-1 text-xs text-gray-400 tabular-nums">{r + 1}</td>
                {cols.map((c, i) => (
                  <td key={i} className="px-1 py-1">
                    <input value={f[i] ?? ''} onChange={(e) => setCelda(r, i, e.target.value)} disabled={!puedeModificar} inputMode={c.tipoDato === 'ENTERO' || c.tipoDato === 'DECIMAL' ? 'decimal' : undefined}
                      placeholder={c.tipoDato === 'FECHA' ? 'dd/mm/aaaa' : c.tipoDato === 'LOGICO' ? 'SI / NO' : ''} className={`${inputCls} py-1`} />
                  </td>
                ))}
                <td className="px-2 py-1">{puedeModificar && <button title="Quitar la fila" onClick={() => { setFilas(filas.filter((_, k) => k !== r)); cambia() }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={cols.length + 2} className="px-4 py-6 text-center text-gray-400">La tabla no tiene filas</td></tr>}
          </tbody>
        </table>
      </div>

      {msg && <div className="mb-3"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      {puedeModificar && (
        <div className="flex items-center gap-3">
          <BotonPrimario onClick={() => { setMsg(null); guardar.mutate() }} disabled={guardar.isPending || !sucio}>{guardar.isPending ? 'Guardando…' : 'Guardar tabla'}</BotonPrimario>
          {sucio && <span className="text-xs text-amber-700">Hay cambios sin guardar</span>}
          {tienePermiso(permisos, 'SLD', 'eliminar') && (
            <BotonSecundario onClick={() => { setMsg(null); preguntar(`¿Borrar la tabla ${data.codigo} con sus ${filas.length} filas?`, () => borrar.mutate(), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} disabled={borrar.isPending} className="ml-auto inline-flex items-center gap-1.5 text-red-600"><Trash2 size={14} /> Borrar tabla</BotonSecundario>
          )}
        </div>
      )}
      {pegar && <PegarDeExcel columnas={cols.length} onAgregar={(nuevas) => { setFilas([...filas, ...nuevas]); cambia() }} onClose={() => setPegar(false)} />}
    </div>
  )
}
