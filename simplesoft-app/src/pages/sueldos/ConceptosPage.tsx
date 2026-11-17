import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Copy, Pencil, Plus, Trash2, XCircle } from 'lucide-react'
import { crearConcepto, getConcepto, getConceptos, modificarConcepto, validarFormula } from '../../api/sueldos'
import { getConceptosGrupo, getGrupos, getGruposDeConcepto, guardarConceptoGrupo, quitarConceptoGrupo } from '../../api/grupos'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import Modal from '../../components/ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import type { ConceptoDetalle, ResultadoValidacion } from '../../types/sueldos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { activos, useCatalogos } from '../../hooks/useCatalogos'

const vacio: ConceptoDetalle = {
  codigo: '', descripcion: '', columna: 'REMUNERATIVO', codigoAfip: null, rubroRecibo: null, simboloUnidad: null, decimalesUnidad: 2, unidadVisible: true, decimalesImporte: 2,
  campoUnidadManual: false, leyendaUnidad: null, campoImporteManual: false, leyendaImporte: null,
  formulaUnidad: null, formulaImporte: null, formulaUnitario: null, formulaCondicion: null, activo: true, orden: 0,
}

type CampoFormula = 'formulaUnidad' | 'formulaImporte' | 'formulaUnitario' | 'formulaCondicion'
const formulas: { clave: CampoFormula; titulo: string; ayuda: string }[] = [
  { clave: 'formulaUnidad', titulo: 'Fórmula de unidad', ayuda: 'Ej.: IF(CAMPO_UNIDAD > 0, CAMPO_UNIDAD, NOVEDADES(FECHA_DESDE..FECHA_HASTA, +, HORA_EXTRA))' },
  { clave: 'formulaImporte', titulo: 'Fórmula de importe', ayuda: 'Ej.: #10 / 30 * UNIDAD * 1.5   (#10 = importe del concepto 10 en este recibo)' },
  { clave: 'formulaCondicion', titulo: 'Condición (cuándo aplica)', ayuda: 'Si da falso o el importe es 0, el concepto no se muestra en el recibo.' },
  { clave: 'formulaUnitario', titulo: 'Valor unitario (opcional)', ayuda: 'Se muestra como valor por unidad.' },
]

/** Una fórmula con su botón Validar (usa el mismo analizador que el cálculo del recibo). */
function EditorFormula({ titulo, ayuda, valor, codigo, deshabilitado, onChange }: {
  titulo: string; ayuda: string; valor: string | null; codigo: string; deshabilitado: boolean; onChange: (v: string) => void
}) {
  const [res, setRes] = useState<ResultadoValidacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const validar = useMutation({
    mutationFn: () => validarFormula(valor, codigo || null),
    onSuccess: (r) => { setRes(r); setError(null) },
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{titulo}</label>
        <button type="button" onClick={() => validar.mutate()} disabled={validar.isPending} className="text-xs text-blue-700 hover:underline disabled:opacity-60">
          {validar.isPending ? 'Validando…' : 'Validar'}
        </button>
      </div>
      <textarea value={valor ?? ''} onChange={(e) => { onChange(e.target.value); setRes(null) }} disabled={deshabilitado} rows={2} spellCheck={false}
        className={`${inputCls} font-mono text-xs`} />
      <p className="text-xs text-gray-400 mt-0.5">{ayuda}</p>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {res && (
        <div className="mt-1 text-xs">
          {res.valida
            ? <p className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={13} /> La fórmula es válida.</p>
            : <p className="inline-flex items-center gap-1 text-red-600"><XCircle size={13} /> {res.error}</p>}
          {res.advertencias.map((a) => <p key={a} className="text-amber-600">⚠ {a}</p>)}
        </div>
      )}
    </div>
  )
}

type Pestania = 'datos' | 'formulas' | 'condiciones' | 'grupos'

/** Pestaña Grupos de la ficha: en qué grupos de conceptos está el concepto, y alta o baja en un grupo. */
function PestaniaGrupos({ codigo, puede }: { codigo: string; puede: boolean }) {
  const qc = useQueryClient()
  const { data: enGrupos } = useQuery({ queryKey: ['sueldos', 'grupos-de-concepto', codigo], queryFn: () => getGruposDeConcepto(codigo) })
  const { data: todos } = useQuery({ queryKey: ['sueldos', 'grupos'], queryFn: getGrupos })
  const [n, setN] = useState({ grupo: '', unidad: '', importe: '' })
  const [error, setError] = useState<string | null>(null)
  const refrescar = () => { qc.invalidateQueries({ queryKey: ['sueldos', 'grupos-de-concepto', codigo] }); qc.invalidateQueries({ queryKey: ['sueldos', 'grupos'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'grupo-conceptos'] }) }
  const numero = (t: string) => (t.trim() === '' ? null : Number(t.replace(',', '.')))
  const agregar = useMutation({
    mutationFn: () => guardarConceptoGrupo(Number(n.grupo), { codigo, tipoLiquidacion: 'TODAS', unidad: numero(n.unidad), importe: numero(n.importe), vigenciaDesde: null, vigenciaHasta: null, orden: null }),
    onSuccess: () => { setN({ grupo: '', unidad: '', importe: '' }); setError(null); refrescar() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  const quitar = useMutation({ mutationFn: (r: { id: number; tipo: string }) => quitarConceptoGrupo(r.id, codigo, r.tipo), onSuccess: refrescar, onError: (e) => setError(mensajeDeError(e)) })
  const libres = (todos ?? []).filter((g) => !(enGrupos ?? []).some((x) => x.idGrupoConceptos === g.idGrupoConceptos))
  return (
    <div className="sm:col-span-2 space-y-3">
      <p className="text-xs text-gray-500">Para que el concepto se liquide tiene que estar en el grupo que corresponde (el del convenio, el de Ganancias…).</p>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100"><th className="px-3 py-2 font-medium">Grupo</th><th className="px-3 py-2 font-medium">Descripción</th><th className="px-3 py-2 font-medium text-right">Unidad</th><th className="px-3 py-2 font-medium text-right">Importe</th><th className="px-3 py-2" /></tr></thead>
          <tbody>
            {enGrupos?.map((g) => (
              <tr key={`${g.idGrupoConceptos}|${g.tipoLiquidacion}`} className="border-b border-gray-50 last:border-0">
                <td className="px-3 py-1.5 font-mono text-xs">{g.codigo}</td><td className="px-3 py-1.5">{g.descripcion}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{g.unidad ?? ''}</td><td className="px-3 py-1.5 text-right tabular-nums">{g.importe ?? ''}</td>
                <td className="px-3 py-1.5 text-right">{puede && <button type="button" title="Sacar del grupo" onClick={() => { setError(null); quitar.mutate({ id: g.idGrupoConceptos, tipo: g.tipoLiquidacion }) }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
            {enGrupos?.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No está en ningún grupo: no se va a liquidar</td></tr>}
          </tbody>
        </table>
      </div>
      {puede && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
          <Campo label="Agregar al grupo" className="col-span-2">
            <select value={n.grupo} onChange={(e) => setN({ ...n, grupo: e.target.value })} className={inputCls}>
              <option value="">Elegí un grupo</option>{libres.map((g) => <option key={g.idGrupoConceptos} value={g.idGrupoConceptos}>{g.codigo} — {g.descripcion}</option>)}
            </select>
          </Campo>
          <Campo label="Unidad"><input value={n.unidad} onChange={(e) => setN({ ...n, unidad: e.target.value })} inputMode="decimal" className={inputCls} /></Campo>
          <Campo label="Importe"><input value={n.importe} onChange={(e) => setN({ ...n, importe: e.target.value })} inputMode="decimal" className={inputCls} /></Campo>
          <BotonPrimario type="button" disabled={!n.grupo || agregar.isPending} onClick={() => { setError(null); agregar.mutate() }} className="inline-flex items-center justify-center gap-1"><Plus size={14} /> Agregar</BotonPrimario>
        </div>
      )}
      {error && <Mensaje tipo="error">{error}</Mensaje>}
    </div>
  )
}

/**
 * Ficha de un concepto, con las pestañas de la referencia: Datos, Fórmulas, Condiciones y Grupos.
 * codigo null = concepto nuevo; duplicarDe = abre con los datos de otro concepto y el código vacío (al guardar se crea uno nuevo y el original no cambia).
 */
function FormConcepto({ codigo, duplicarDe, onClose }: { codigo: string | null; duplicarDe?: string | null; onClose: () => void }) {
  const qc = useQueryClient()
  const cat = useCatalogos()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const [modoDuplicar, setModoDuplicar] = useState(!!duplicarDe)
  const origen = codigo ?? duplicarDe ?? null
  const esNuevo = !codigo || modoDuplicar
  const puedeModificar = tienePermiso(permisos, 'SLD', esNuevo ? 'crear' : 'modificar')
  const { data: actual, isLoading } = useQuery({ queryKey: ['sueldos', 'concepto', origen], queryFn: () => getConcepto(origen!), enabled: !!origen })
  const [f, setF] = useState<ConceptoDetalle | null>(origen ? null : vacio)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Pestania>('datos')
  const form = f ?? (actual ? (modoDuplicar ? { ...actual, codigo: '' } : actual) : null)

  const guardar = useMutation({
    mutationFn: () => (esNuevo ? crearConcepto(form!) : modificarConcepto(codigo!, form!)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'conceptos'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'concepto'] }); onClose() },
    onError: (e) => setError(mensajeDeError(e)),
  })

  const set = <K extends keyof ConceptoDetalle>(k: K, v: ConceptoDetalle[K]) => setF({ ...form!, [k]: v })
  const texto = (k: keyof ConceptoDetalle) => ((form?.[k] as string | null) ?? '')
  const titulo = esNuevo ? (modoDuplicar ? `Duplicar el concepto ${origen}` : 'Nuevo concepto') : `Concepto ${codigo}`
  const pestanias: [Pestania, string][] = [['datos', 'Datos'], ['formulas', 'Fórmulas'], ['condiciones', 'Condiciones'], ['grupos', 'Grupos']]

  return (
    <Modal titulo={titulo} onClose={onClose} ancho="max-w-3xl">
      {isLoading || !form ? <p className="text-sm text-gray-500">Cargando…</p> : (
        <form onSubmit={(e) => {
          e.preventDefault(); setError(null)
          // el rubro es obligatorio en descuentos y contribuciones (el campo está en la pestaña Datos: se vuelve a ella para elegirlo)
          if ((form.columna === 'DESCUENTO' || form.columna === 'CONTRIBUCION') && !form.rubroRecibo) { setTab('datos'); setError('Elegí el rubro del recibo: los descuentos y las contribuciones tienen que llevarlo («Otros rubros» si no es de ninguno de los demás).'); return }
          guardar.mutate()
        }} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex gap-1 border-b border-gray-200 -mt-1">
            {pestanias.filter(([k]) => k !== 'grupos' || !esNuevo).map(([k, t]) => (
              <button type="button" key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${tab === k ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
            ))}
          </div>

          {/* el código y la descripción se ven siempre: al duplicar hay que cambiarlos */}
          <Campo label="Código"><input value={form.codigo} onChange={(e) => set('codigo', e.target.value.toUpperCase())} disabled={!esNuevo} maxLength={10} className={inputCls} /></Campo>
          <Campo label="Descripción"><input value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} className={inputCls} /></Campo>

          {tab === 'datos' && <>
            <Campo label="Columna del recibo">
              <select value={form.columna} onChange={(e) => set('columna', e.target.value)} className={inputCls}>
                {activos(cat.columnasConcepto).map((c) => <option key={c.codigo} value={c.codigo}>{c.descripcion}</option>)}
                {!cat.columnasConcepto.some((c) => c.activo && c.codigo === form.columna) && <option value={form.columna}>{cat.nombreColumnaConcepto(form.columna)}</option>}
              </select>
            </Campo>
            {(form.columna === 'DESCUENTO' || form.columna === 'CONTRIBUCION') && (
              <Campo label="Rubro en el recibo nuevo (Decreto 407/2026) *">
                <select value={form.rubroRecibo ?? ''} onChange={(e) => set('rubroRecibo', e.target.value || null)} required className={inputCls}>
                  <option value="">Elegí el rubro…</option>
                  {activos(cat.rubrosRecibo).map((x) => <option key={x.codigo} value={x.codigo}>{x.descripcion}</option>)}
                  {form.rubroRecibo && !cat.rubrosRecibo.some((x) => x.activo && x.codigo === form.rubroRecibo) && <option value={form.rubroRecibo}>{cat.nombreRubroRecibo(form.rubroRecibo)}</option>}
                </select>
                <p className="text-xs text-gray-400 mt-0.5">{form.columna === 'DESCUENTO' ? 'Es el aporte del trabajador.' : 'Es la contribución del empleador.'} Sirve para el detalle de la composición salarial y el gráfico del recibo nuevo; el recibo de siempre no lo usa. Si no es de ninguno de los rubros, elegí «Otros rubros».</p>
              </Campo>
            )}
            <Campo label="Orden de cálculo e impresión"><input type="number" value={form.orden} onChange={(e) => set('orden', Number(e.target.value))} className={inputCls} /></Campo>
            <Campo label="Código AFIP (para el F.931 y el LSD)"><input value={texto('codigoAfip')} onChange={(e) => set('codigoAfip', e.target.value)} maxLength={10} className={inputCls} /></Campo>
            <Campo label="Símbolo de la unidad (hs, %, días)"><input value={texto('simboloUnidad')} onChange={(e) => set('simboloUnidad', e.target.value)} maxLength={10} className={inputCls} /></Campo>
            <Campo label="Decimales de la unidad"><input type="number" min={0} max={8} value={form.decimalesUnidad} onChange={(e) => set('decimalesUnidad', Number(e.target.value))} className={inputCls} /></Campo>
            <Campo label="Decimales del importe"><input type="number" min={0} max={8} value={form.decimalesImporte} onChange={(e) => set('decimalesImporte', Number(e.target.value))} className={inputCls} /></Campo>
            <div className="sm:col-span-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.unidadVisible} onChange={(e) => set('unidadVisible', e.target.checked)} /> Mostrar la unidad en el recibo</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.campoUnidadManual} onChange={(e) => set('campoUnidadManual', e.target.checked)} /> Se puede cargar la unidad a mano</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.campoImporteManual} onChange={(e) => set('campoImporteManual', e.target.checked)} /> Se puede cargar el importe a mano</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} /> Activo</label>
            </div>
            {form.campoUnidadManual && <Campo label="Etiqueta del campo manual de unidad"><input value={texto('leyendaUnidad')} onChange={(e) => set('leyendaUnidad', e.target.value)} maxLength={60} className={inputCls} /></Campo>}
            {form.campoImporteManual && <Campo label="Etiqueta del campo manual de importe"><input value={texto('leyendaImporte')} onChange={(e) => set('leyendaImporte', e.target.value)} maxLength={60} className={inputCls} /></Campo>}
          </>}

          {tab === 'formulas' && formulas.filter((x) => x.clave !== 'formulaCondicion').map((x) => (
            <EditorFormula key={x.clave} titulo={x.titulo} ayuda={x.ayuda} valor={form[x.clave]} codigo={form.codigo} deshabilitado={!puedeModificar} onChange={(v) => set(x.clave, v)} />
          ))}
          {tab === 'condiciones' && formulas.filter((x) => x.clave === 'formulaCondicion').map((x) => (
            <EditorFormula key={x.clave} titulo={x.titulo} ayuda={x.ayuda} valor={form[x.clave]} codigo={form.codigo} deshabilitado={!puedeModificar} onChange={(v) => set(x.clave, v)} />
          ))}
          {tab === 'grupos' && !esNuevo && <PestaniaGrupos codigo={codigo!} puede={tienePermiso(permisos, 'SLD', 'modificar')} />}

          {error && <div className="sm:col-span-2"><Mensaje tipo="error">{error}</Mensaje></div>}
          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            <div>
              {!esNuevo && tienePermiso(permisos, 'SLD', 'crear') && (
                <BotonSecundario type="button" onClick={() => { setF({ ...form, codigo: '' }); setModoDuplicar(true); setTab('datos') }} className="inline-flex items-center gap-1.5"><Copy size={14} /> Duplicar</BotonSecundario>
              )}
              {modoDuplicar && <span className="text-xs text-gray-500">Cambiá el código y la descripción; el concepto original queda sin cambios.</span>}
            </div>
            <div className="flex gap-2">
              <BotonSecundario type="button" onClick={onClose}>Cerrar</BotonSecundario>
              {puedeModificar && <BotonPrimario type="submit" disabled={guardar.isPending || !form.codigo.trim() || !form.descripcion.trim()}>{guardar.isPending ? 'Guardando…' : esNuevo ? 'Agregar' : 'Guardar'}</BotonPrimario>}
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}

/** Conceptos de liquidación de la empresa: lista, alta y edición con sus fórmulas. */
export default function ConceptosPage() {
  const cat = useCatalogos()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const [filtro, setFiltro] = useState('')
  const [columna, setColumna] = useState('')
  const [activo, setActivo] = useState('')
  const [grupo, setGrupo] = useState('')
  const [edit, setEdit] = useState<string | 'nuevo' | null>(null)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'conceptos'], queryFn: getConceptos })

  const { data: grupos } = useQuery({ queryKey: ['sueldos', 'grupos'], queryFn: getGrupos })
  const { data: delGrupo } = useQuery({ queryKey: ['sueldos', 'grupo-conceptos', Number(grupo)], queryFn: () => getConceptosGrupo(Number(grupo)), enabled: !!grupo })
  const codigosGrupo = useMemo(() => new Set((delGrupo ?? []).map((r) => r.codigo)), [delGrupo])

  const lista = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    return (data ?? []).filter((c) =>
      (!f || c.codigo.toLowerCase().includes(f) || c.descripcion.toLowerCase().includes(f)) &&
      (!columna || c.columna === columna) &&
      (!activo || (activo === 'si' ? c.activo : !c.activo)) &&
      (!grupo || codigosGrupo.has(c.codigo)))
  }, [data, filtro, columna, activo, grupo, codigosGrupo])
  const pag = usePaginado(lista)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Conceptos</h1>
        {tienePermiso(permisos, 'SLD', 'crear') && <BotonPrimario onClick={() => setEdit('nuevo')} className="inline-flex items-center gap-1.5 shrink-0"><Plus size={16} /> Nuevo concepto</BotonPrimario>}
      </div>
      <p className="text-gray-500 mb-4">Los conceptos con los que se arman los recibos de la empresa, con sus fórmulas.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por código o descripción"
          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={columna} onChange={(e) => setColumna(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas las columnas</option>{activos(cat.columnasConcepto).map((c) => <option key={c.codigo} value={c.codigo}>{c.descripcion}</option>)}
        </select>
        <select value={activo} onChange={(e) => setActivo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Activos e inactivos</option><option value="si">Solo activos</option><option value="no">Solo inactivos</option>
        </select>
        <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los grupos</option>{grupos?.map((g) => <option key={g.idGrupoConceptos} value={g.idGrupoConceptos}>{g.codigo} — {g.descripcion}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-600">{mensajeDeError(error, 'No se pudieron cargar los conceptos.')}</p>}

      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Descripción</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium text-right">Orden</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {pag.filas.map((c) => (
                <tr key={c.codigo} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{c.codigo}</td>
                  <td className="px-4 py-2">{c.descripcion}</td>
                  <td className="px-4 py-2 text-gray-600">{cat.nombreColumnaConcepto(c.columna)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-500">{c.orden}</td>
                  <td className="px-4 py-2">{c.activo ? <span className="text-xs text-green-700">Activo</span> : <span className="text-xs text-gray-400">Inactivo</span>}</td>
                  <td className="px-4 py-2 text-right"><button title="Ver o editar" onClick={() => setEdit(c.codigo)} className="text-gray-500 hover:text-blue-700"><Pencil size={14} /></button></td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin resultados</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">{lista.length} de {data.length} conceptos</div>
        </div>
      )}
      {edit && <FormConcepto codigo={edit === 'nuevo' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}
