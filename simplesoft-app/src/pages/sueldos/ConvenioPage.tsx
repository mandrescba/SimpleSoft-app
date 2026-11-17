import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Pencil, Plus, Power, RotateCcw, Trash2 } from 'lucide-react'
import {
  agregarEscala, bajaConvenio, buscarObrasSociales, crearCategoria, crearGrupoConvenio, eliminarCategoria, eliminarEscala, getConvenio, getEscalas,
  modificarCategoria, modificarConvenio, reactivarConvenio, type CategoriaForm,
} from '../../api/convenios'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { formatoDinero } from '../../lib/formato'
import Modal from '../../components/ui/Modal'
import ConceptosDeGrupo from '../../components/sueldos/ConceptosDeGrupo'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import type { CategoriaConvenio, ConvenioDetalle } from '../../types/sueldos'
import { activos, useCatalogos } from '../../hooks/useCatalogos'
import { preguntar } from '../../components/ui/Confirmar'

const dia = (s: string | null) => (s ? s.slice(0, 10) : '')
const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString('es-AR') : 'sin fin')
const num = (t: string) => (t.trim() === '' ? null : Number(t.replace(',', '.')))
const txt = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

type Pestania = 'convenio' | 'categorias' | 'conceptos'

// ---------------------------------------------------------------- pestaña Convenio

function PestaniaConvenio({ c, puede }: { c: ConvenioDetalle; puede: boolean }) {
  const cat = useCatalogos()
  const qc = useQueryClient()
  const [f, setF] = useState(c)
  const [os, setOs] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  useEffect(() => setF(c), [c])
  const { data: opciones } = useQuery({ queryKey: ['sueldos', 'obras-sociales', os], queryFn: () => buscarObrasSociales(os), enabled: os.trim().length >= 2 })

  const guardar = useMutation({
    mutationFn: () => modificarConvenio(c.idConvenio, { ...f }),
    onSuccess: () => { setMsg({ tipo: 'ok', texto: 'Convenio guardado.' }); qc.invalidateQueries({ queryKey: ['sueldos', 'convenio', c.idConvenio] }); qc.invalidateQueries({ queryKey: ['sueldos', 'convenios'] }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const estado = useMutation({
    mutationFn: () => (c.activo ? bajaConvenio(c.idConvenio) : reactivarConvenio(c.idConvenio)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'convenio', c.idConvenio] }); qc.invalidateQueries({ queryKey: ['sueldos', 'convenios'] }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); guardar.mutate() }} className="bg-white border border-gray-200 rounded-xl p-4 grid sm:grid-cols-2 gap-4">
      <Campo label="Convenio"><input value={f.codigo} disabled className={inputCls} /></Campo>
      <Campo label="Descripción"><input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} disabled={!puede} className={inputCls} /></Campo>
      <Campo label="Modalidad de liquidación">
        <select value={f.liquidacion} onChange={(e) => setF({ ...f, liquidacion: e.target.value })} disabled={!puede} className={inputCls}>
          {activos(cat.modalidadesLiquidacion).map((m) => <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>)}
          {!cat.modalidadesLiquidacion.some((m) => m.activo && m.codigo === f.liquidacion) && <option value={f.liquidacion}>{cat.nombreModalidad(f.liquidacion)}</option>}
        </select>
      </Campo>
      <Campo label="Moneda"><input value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value.toUpperCase() })} maxLength={3} disabled={!puede} className={inputCls} /></Campo>
      <Campo label="Días de trabajo"><input value={txt(f.diasMes)} onChange={(e) => setF({ ...f, diasMes: num(e.target.value) })} disabled={!puede} inputMode="decimal" className={inputCls} /></Campo>
      <Campo label="Horas por mes"><input value={txt(f.horasMes)} onChange={(e) => setF({ ...f, horasMes: num(e.target.value) })} disabled={!puede} inputMode="decimal" className={inputCls} /></Campo>
      <Campo label="Horas por día"><input value={txt(f.horasDia)} onChange={(e) => setF({ ...f, horasDia: num(e.target.value) })} disabled={!puede} inputMode="decimal" className={inputCls} /></Campo>
      <Campo label="Días de vacaciones (opcional)"><input value={txt(f.diasVacaciones)} onChange={(e) => setF({ ...f, diasVacaciones: num(e.target.value) })} disabled={!puede} inputMode="decimal" className={inputCls} /></Campo>
      <Campo label="Orden"><input type="number" value={f.orden} onChange={(e) => setF({ ...f, orden: Number(e.target.value) })} disabled={!puede} className={inputCls} /></Campo>
      <div className="sm:col-span-2">
        <Campo label={`Obra social por defecto${f.idObraSocial ? ` — ${f.obraSocial ?? ''}` : ''}`}>
          <input value={os} onChange={(e) => setOs(e.target.value)} placeholder="Escribí 2 letras para buscar (código o nombre)" disabled={!puede} className={inputCls} />
        </Campo>
        {opciones && os.trim().length >= 2 && (
          <ul className="mt-1 max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100 text-sm">
            {opciones.map((o) => (
              <li key={o.idObraSocial}>
                <button type="button" onClick={() => { setF({ ...f, idObraSocial: o.idObraSocial, obraSocial: `${o.codigo} ${o.descripcion}` }); setOs('') }} className="w-full text-left px-3 py-1.5 hover:bg-blue-50">
                  <span className="font-mono text-xs text-gray-400 mr-2">{o.codigo}</span>{o.descripcion}
                </button>
              </li>
            ))}
            {opciones.length === 0 && <li className="px-3 py-2 text-gray-400">Sin resultados</li>}
          </ul>
        )}
        {f.idObraSocial && puede && <button type="button" onClick={() => setF({ ...f, idObraSocial: null, obraSocial: null })} className="text-xs text-gray-500 hover:underline mt-1">Quitar la obra social</button>}
      </div>
      {msg && <div className="sm:col-span-2"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      {puede && (
        <div className="sm:col-span-2 flex justify-between gap-2">
          <BotonSecundario type="button" disabled={estado.isPending} onClick={() => { if (!c.activo) estado.mutate(); else preguntar('¿Dar de baja el convenio? Sus empleados y recibos viejos lo conservan.', () => estado.mutate(), { titulo: 'Dar de baja', boton: 'Dar de baja', peligro: true })}}
            className={`inline-flex items-center gap-1.5 ${c.activo ? 'text-red-600' : 'text-green-700'}`}>{c.activo ? <><Power size={14} /> Dar de baja</> : <><RotateCcw size={14} /> Reactivar</>}</BotonSecundario>
          <BotonPrimario type="submit" disabled={guardar.isPending || !f.descripcion.trim()}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</BotonPrimario>
        </div>
      )}
    </form>
  )
}

// ---------------------------------------------------------------- pestaña Categorías

function FormCategoria({ idConvenio, actual, onClose }: { idConvenio: number; actual: CategoriaConvenio | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState<CategoriaForm>(actual
    ? { codigo: actual.codigo, descripcion: actual.descripcion, jornada: actual.jornada, orden: actual.orden }
    : { codigo: '', descripcion: '', jornada: 'COMPLETA', orden: 0, vigenciaDesde: `${new Date().getFullYear()}-01-01`, sueldo: null, adicional: null, auxiliar: null })
  const [error, setError] = useState<string | null>(null)
  const guardar = useMutation({
    mutationFn: () => (actual ? modificarCategoria(idConvenio, actual.idCategoria, f) : crearCategoria(idConvenio, f)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'convenio', idConvenio] }); qc.invalidateQueries({ queryKey: ['sueldos', 'catalogos'] }); onClose() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <Modal titulo={actual ? `Categoría ${actual.codigo}` : 'Nueva categoría'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="grid sm:grid-cols-2 gap-4">
        <Campo label="Categoría (código)"><input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase() })} disabled={!!actual} maxLength={20} placeholder="VENDEDOR_B" className={inputCls} /></Campo>
        <Campo label="Descripción"><input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} className={inputCls} /></Campo>
        <Campo label="Jornada">
          <select value={f.jornada ?? ''} onChange={(e) => setF({ ...f, jornada: e.target.value || null })} className={inputCls}>
            <option value="">—</option><option value="COMPLETA">Completa</option><option value="MEDIA">Media</option><option value="REDUCIDA">Reducida</option>
          </select>
        </Campo>
        <Campo label="Orden"><input type="number" value={f.orden} onChange={(e) => setF({ ...f, orden: Number(e.target.value) })} className={inputCls} /></Campo>
        {!actual && <>
          <Campo label="Sueldo desde (vigencia)"><input type="date" value={f.vigenciaDesde ?? ''} onChange={(e) => setF({ ...f, vigenciaDesde: e.target.value })} className={inputCls} /></Campo>
          <Campo label="Sueldo básico"><input value={txt(f.sueldo)} onChange={(e) => setF({ ...f, sueldo: num(e.target.value) })} inputMode="decimal" className={inputCls} /></Campo>
          <Campo label="Adicional"><input value={txt(f.adicional)} onChange={(e) => setF({ ...f, adicional: num(e.target.value) })} inputMode="decimal" className={inputCls} /></Campo>
          <Campo label="Auxiliar"><input value={txt(f.auxiliar)} onChange={(e) => setF({ ...f, auxiliar: num(e.target.value) })} inputMode="decimal" className={inputCls} /></Campo>
        </>}
        {error && <div className="sm:col-span-2"><Mensaje tipo="error">{error}</Mensaje></div>}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={guardar.isPending || !f.codigo.trim() || !f.descripcion.trim()}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Historial de sueldos de la categoría por vigencia ("Períodos…"). */
function Periodos({ idConvenio, cat, puede, onClose }: { idConvenio: number; cat: CategoriaConvenio; puede: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['sueldos', 'escalas', cat.idCategoria], queryFn: () => getEscalas(idConvenio, cat.idCategoria) })
  const [n, setN] = useState({ desde: '', sueldo: '', adicional: '', auxiliar: '' })
  const [error, setError] = useState<string | null>(null)
  const refrescar = () => { qc.invalidateQueries({ queryKey: ['sueldos', 'escalas', cat.idCategoria] }); qc.invalidateQueries({ queryKey: ['sueldos', 'convenio', idConvenio] }) }
  const agregar = useMutation({
    mutationFn: () => agregarEscala(idConvenio, cat.idCategoria, { vigenciaDesde: n.desde, sueldo: Number(n.sueldo.replace(',', '.')), adicional: num(n.adicional), auxiliar: num(n.auxiliar) }),
    onSuccess: () => { setN({ desde: '', sueldo: '', adicional: '', auxiliar: '' }); setError(null); refrescar() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  const borrar = useMutation({ mutationFn: (desde: string) => eliminarEscala(idConvenio, cat.idCategoria, desde), onSuccess: refrescar, onError: (e) => setError(mensajeDeError(e)) })
  return (
    <Modal titulo={`Períodos — ${cat.codigo} ${cat.descripcion}`} onClose={onClose} ancho="max-w-2xl">
      <p className="text-xs text-gray-500 mb-3">Los convenios se actualizan por paritarias: cada escala rige desde su fecha y hasta que arranca la siguiente. Los recibos toman la escala vigente a la fecha de la liquidación.</p>
      <div className="border border-gray-200 rounded-lg overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-3 py-2 font-medium">Desde</th><th className="px-3 py-2 font-medium">Hasta</th><th className="px-3 py-2 font-medium text-right">Sueldo</th>
            <th className="px-3 py-2 font-medium text-right">Adicional</th><th className="px-3 py-2 font-medium text-right">Auxiliar</th><th className="px-3 py-2" />
          </tr></thead>
          <tbody>
            {data?.map((e) => (
              <tr key={e.vigenciaDesde} className="border-b border-gray-50 last:border-0">
                <td className="px-3 py-1.5">{fecha(e.vigenciaDesde)}</td><td className="px-3 py-1.5">{fecha(e.vigenciaHasta)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatoDinero(e.sueldo)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{e.adicional === null ? '' : formatoDinero(e.adicional)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{e.auxiliar === null ? '' : formatoDinero(e.auxiliar)}</td>
                <td className="px-3 py-1.5 text-right">{puede && <button title="Borrar esta escala" onClick={() => { preguntar(`¿Borrar la escala desde ${fecha(e.vigenciaDesde)}?`, () => borrar.mutate(dia(e.vigenciaDesde)), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {puede && (
        <form onSubmit={(e) => { e.preventDefault(); setError(null); agregar.mutate() }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <Campo label="Nueva escala desde"><input type="date" value={n.desde} onChange={(e) => setN({ ...n, desde: e.target.value })} className={inputCls} /></Campo>
          <Campo label="Sueldo"><input value={n.sueldo} onChange={(e) => setN({ ...n, sueldo: e.target.value })} inputMode="decimal" className={inputCls} /></Campo>
          <Campo label="Adicional"><input value={n.adicional} onChange={(e) => setN({ ...n, adicional: e.target.value })} inputMode="decimal" className={inputCls} /></Campo>
          <Campo label="Auxiliar"><input value={n.auxiliar} onChange={(e) => setN({ ...n, auxiliar: e.target.value })} inputMode="decimal" className={inputCls} /></Campo>
          <div className="col-span-2 sm:col-span-4 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">La escala anterior termina el día previo. Si repetís una fecha, se reemplaza.</p>
            <BotonPrimario type="submit" disabled={agregar.isPending || !n.desde || !n.sueldo}>{agregar.isPending ? 'Guardando…' : 'Agregar'}</BotonPrimario>
          </div>
        </form>
      )}
      {error && <div className="mt-3"><Mensaje tipo="error">{error}</Mensaje></div>}
    </Modal>
  )
}

function PestaniaCategorias({ idConvenio, categorias, puedeModificar, puedeCrear, puedeEliminar }: {
  idConvenio: number; categorias: CategoriaConvenio[]; puedeModificar: boolean; puedeCrear: boolean; puedeEliminar: boolean
}) {
  const qc = useQueryClient()
  const [edit, setEdit] = useState<CategoriaConvenio | 'nueva' | null>(null)
  const [periodos, setPeriodos] = useState<CategoriaConvenio | null>(null)
  const [error, setError] = useState<string | null>(null)
  const borrar = useMutation({
    mutationFn: (id: number) => eliminarCategoria(idConvenio, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sueldos', 'convenio', idConvenio] }),
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <div>
      <div className="flex justify-end mb-2">{puedeCrear && <BotonPrimario onClick={() => setEdit('nueva')} className="inline-flex items-center gap-1.5"><Plus size={16} /> Nueva categoría</BotonPrimario>}</div>
      {error && <div className="mb-3"><Mensaje tipo="error">{error}</Mensaje></div>}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 font-medium">Categoría</th><th className="px-4 py-2 font-medium">Descripción</th><th className="px-4 py-2 font-medium text-right">Sueldo</th>
            <th className="px-4 py-2 font-medium text-right">Adicional</th><th className="px-4 py-2 font-medium text-right">Auxiliar</th><th className="px-4 py-2 font-medium text-right">Orden</th><th className="px-4 py-2 font-medium text-right">Empleados</th><th className="px-4 py-2" />
          </tr></thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.idCategoria} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{c.codigo}</td><td className="px-4 py-2">{c.descripcion}</td>
                <td className="px-4 py-2 text-right tabular-nums">{c.sueldo === null ? <span className="text-gray-300">—</span> : formatoDinero(c.sueldo)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{c.adicional === null ? '' : formatoDinero(c.adicional)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{c.auxiliar === null ? '' : formatoDinero(c.auxiliar)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{c.orden}</td><td className="px-4 py-2 text-right tabular-nums">{c.empleados}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button title="Períodos (escala de sueldos por vigencia)" onClick={() => setPeriodos(c)} className="text-gray-500 hover:text-blue-700 mr-2"><CalendarClock size={15} /></button>
                  {puedeModificar && <button title="Modificar" onClick={() => setEdit(c)} className="text-gray-500 hover:text-blue-700 mr-2"><Pencil size={14} /></button>}
                  {puedeEliminar && <button title="Borrar" onClick={() => { setError(null); preguntar(`¿Borrar la categoría ${c.codigo} con todas sus escalas?`, () => borrar.mutate(c.idCategoria), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                </td>
              </tr>
            ))}
            {categorias.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Todavía no hay categorías</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">Los importes son los de la escala vigente hoy. Con el botón del calendario ves y cargás el historial por período.</p>
      {edit && <FormCategoria idConvenio={idConvenio} actual={edit === 'nueva' ? null : edit} onClose={() => setEdit(null)} />}
      {periodos && <Periodos idConvenio={idConvenio} cat={periodos} puede={puedeModificar} onClose={() => setPeriodos(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------- pestaña Conceptos

function PestaniaConceptos({ c, puede }: { c: ConvenioDetalle; puede: boolean }) {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const grupo = useMutation({
    mutationFn: () => crearGrupoConvenio(c.idConvenio),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'convenio', c.idConvenio] }); qc.invalidateQueries({ queryKey: ['sueldos', 'grupos'] }) },
    onError: (e) => setError(mensajeDeError(e)),
  })
  if (!c.idGrupoConceptos) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-gray-600 mb-3">Este convenio todavía no tiene un grupo de conceptos.</p>
        {puede && <BotonPrimario onClick={() => { setError(null); grupo.mutate() }} disabled={grupo.isPending}>Crear el grupo de conceptos del convenio</BotonPrimario>}
        {error && <div className="mt-3"><Mensaje tipo="error">{error}</Mensaje></div>}
      </div>
    )
  }
  return <ConceptosDeGrupo idGrupo={c.idGrupoConceptos} puede={puede} />
}

// ---------------------------------------------------------------- página

/** Un convenio: cabecera, categorías con su escala de sueldos y conceptos que aplica. */
export default function ConvenioPage() {
  const id = Number(useParams().id)
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const [tab, setTab] = useState<Pestania>('convenio')
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'convenio', id], queryFn: () => getConvenio(id) })

  if (isLoading) return <p className="text-sm text-gray-500">Cargando…</p>
  if (isError || !data) return <Mensaje tipo="error">{mensajeDeError(error, 'No se encontró el convenio.')}</Mensaje>
  const { convenio: c, categorias } = data
  const puedeModificar = tienePermiso(permisos, 'SLD', 'modificar')

  return (
    <div>
      <Link to="/sueldos/convenios" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 mb-2"><ArrowLeft size={14} /> Convenios</Link>
      <h1 className="text-2xl font-bold text-gray-800">{c.codigo} <span className="text-gray-400 font-normal">— {c.descripcion}</span>{!c.activo && <span className="ml-2 text-sm text-gray-400">(de baja)</span>}</h1>
      <div className="flex gap-1 border-b border-gray-200 my-4">
        {([['convenio', 'Convenio'], ['categorias', `Categorías (${categorias.length})`], ['conceptos', 'Conceptos']] as [Pestania, string][]).map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>
      {tab === 'convenio' && <PestaniaConvenio c={c} puede={puedeModificar} />}
      {tab === 'categorias' && <PestaniaCategorias idConvenio={id} categorias={categorias} puedeModificar={puedeModificar} puedeCrear={tienePermiso(permisos, 'SLD', 'crear')} puedeEliminar={tienePermiso(permisos, 'SLD', 'eliminar')} />}
      {tab === 'conceptos' && <PestaniaConceptos c={c} puede={puedeModificar} />}
    </div>
  )
}
