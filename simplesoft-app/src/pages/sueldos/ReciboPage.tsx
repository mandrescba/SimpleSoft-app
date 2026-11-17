import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Calculator, FileText, Lock, PieChart, Plus, Trash2, XCircle } from 'lucide-react'
import { abrirPdfRecibo, agregarConceptoRecibo, getRecibo, guardarDatosRecibo, quitarConceptoRecibo, recalcularRecibo, type ManualesRecibo } from '../../api/liquidaciones'
import { getConceptos } from '../../api/sueldos'
import { getNovedades } from '../../api/empleados'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { formatoDinero, formatoNumero } from '../../lib/formato'
import Modal from '../../components/ui/Modal'
import VerCalculo from '../../components/sueldos/VerCalculo'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import type { LineaGuardada } from '../../types/sueldos'
import { activos, useCatalogos } from '../../hooks/useCatalogos'
import { preguntar } from '../../components/ui/Confirmar'

type Pestania = 'conceptos' | 'contribuciones' | 'auxiliares' | 'novedades'

const aTexto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))
const aNumero = (t: string) => (t.trim() === '' ? null : Number(t.replace(',', '.')))

/** Buscador de conceptos: modal con filtro de texto sobre los activos que el recibo todavía no tiene. */
function BuscarConcepto({ yaEnRecibo, pendiente, onElegir, onClose }: { yaEnRecibo: Set<string>; pendiente: boolean; onElegir: (codigo: string) => void; onClose: () => void }) {
  const cat = useCatalogos()
  const [filtro, setFiltro] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['sueldos', 'conceptos'], queryFn: getConceptos })
  const lista = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    return (data ?? []).filter((c) => c.activo && !cat.esCalculoInterno(c.columna) && !yaEnRecibo.has(c.codigo) &&
      (!f || c.codigo.toLowerCase().includes(f) || c.descripcion.toLowerCase().includes(f)))
  }, [data, filtro, yaEnRecibo, cat])
  return (
    <Modal titulo="Agregar un concepto al recibo" onClose={onClose}>
      <input autoFocus value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por código o descripción" className={`${inputCls} mb-3`} />
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {lista.map((c) => (
          <li key={c.codigo}>
            <button type="button" disabled={pendiente} onClick={() => onElegir(c.codigo)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 disabled:opacity-60">
              <span className="font-mono text-xs text-gray-400 mr-2">{c.codigo}</span>{c.descripcion}
            </button>
          </li>
        ))}
        {!isLoading && lista.length === 0 && <li className="px-3 py-4 text-sm text-gray-400 text-center">No hay conceptos para agregar</li>}
      </ul>
    </Modal>
  )
}

function Total({ titulo, valor, destacado }: { titulo: string; valor: number; destacado?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${destacado ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-gray-200'}`}>
      <div className={`text-xs ${destacado ? 'text-blue-100' : 'text-gray-500'}`}>{titulo}</div>
      <div className="text-lg font-semibold tabular-nums">{formatoDinero(valor)}</div>
    </div>
  )
}

/** Un recibo guardado: renglones, valores manuales (si la liquidación está abierta) y PDF. */
export default function ReciboPage() {
  const catalogos = useCatalogos()
  // los grupos de renglones y su solapa salen del catálogo de columnas de concepto
  const grupos = activos(catalogos.columnasConcepto).map((c) => ({ clave: c.codigo, titulo: c.tituloGrupo, tab: catalogos.solapaDeColumna(c.codigo) as Pestania, interno: c.calculoInterno }))
  const { id: idParam, idRecibo: idReciboParam } = useParams()
  const id = Number(idParam), idRecibo = Number(idReciboParam)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const puedeModificar = tienePermiso(permisos, 'SLD', 'modificar')
  const [tab, setTab] = useState<Pestania>('conceptos')
  const [obs, setObs] = useState('')
  const [liqFinal, setLiqFinal] = useState('')
  const [manuales, setManuales] = useState<Record<string, { unidad: string; importe: string }>>({})
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [verCalculo, setVerCalculo] = useState<string | null>(null)   // código del concepto cuyo cálculo se está viendo

  const { data: r, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'recibo', id, idRecibo], queryFn: () => getRecibo(id, idRecibo) })

  // los campos manuales parten de lo guardado en el recibo
  useEffect(() => {
    if (!r) return
    const m: Record<string, { unidad: string; importe: string }> = {}
    for (const l of r.lineas) if (l.unidadManual !== null || l.importeManual !== null) m[l.codigo] = { unidad: aTexto(l.unidadManual), importe: aTexto(l.importeManual) }
    setManuales(m)
    setObs(r.observaciones ?? '')
    setLiqFinal(r.liquidacionFinal ? r.liquidacionFinal.slice(0, 10) : '')
  }, [r])

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo: ManualesRecibo = {}
      for (const [cod, v] of Object.entries(manuales)) {
        const u = aNumero(v.unidad), i = aNumero(v.importe)
        if (u !== null || i !== null) cuerpo[cod] = { unidad: u, importe: i }
      }
      return recalcularRecibo(id, r!.idEmpleado, cuerpo, r!.numero)
    },
    onSuccess: (res) => {
      qc.removeQueries({ queryKey: ['sueldos', 'recibo', id, idRecibo] })   // ese número de recibo ya no existe
      qc.invalidateQueries({ queryKey: ['sueldos'] })
      setMsg(res.estado === 'OK' ? { tipo: 'ok', texto: 'Recibo recalculado y guardado.' } : { tipo: 'error', texto: res.mensaje ?? 'No se pudo recalcular.' })
      // al recalcular el recibo se vuelve a grabar con otro número: seguimos en el nuevo
      if (res.estado === 'OK' && res.idRecibo) navigate(`/sueldos/liquidaciones/${id}/recibos/${res.idRecibo}`, { replace: true })
    },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  const anioPeriodo = Number(/\/(\d{4})/.exec(r?.periodo ?? '')?.[1] ?? 0)
  const mesPeriodo = Number(/^(\d{2})\//.exec(r?.periodo ?? '')?.[1] ?? 0)
  const { data: novedades } = useQuery({ queryKey: ['sueldos', 'novedades', r?.idEmpleado, anioPeriodo], queryFn: () => getNovedades(r!.idEmpleado, anioPeriodo), enabled: !!r && anioPeriodo > 0 && tab === 'novedades' })
  const novedadesDelMes = (novedades ?? []).filter((n) => Number(n.fecha.slice(5, 7)) === mesPeriodo)

  const guardarDatos = useMutation({
    mutationFn: () => guardarDatosRecibo(id, idRecibo, { observaciones: obs.trim() || null, liquidacionFinal: liqFinal || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'recibo', id, idRecibo] }); setMsg({ tipo: 'ok', texto: 'Datos del recibo guardados.' }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  // agregar o quitar un concepto recalcula y vuelve a grabar el recibo con otro id: seguimos en el nuevo
  const alAjustar = (texto: string) => (res: { estado: string; idRecibo: number | null; mensaje: string | null }) => {
    qc.removeQueries({ queryKey: ['sueldos', 'recibo', id, idRecibo] })
    qc.invalidateQueries({ queryKey: ['sueldos'] })
    setBuscando(false)
    setMsg(res.estado === 'OK' ? { tipo: 'ok', texto } : { tipo: 'error', texto: res.mensaje ?? 'No se pudo recalcular.' })
    if (res.estado === 'OK' && res.idRecibo) navigate(`/sueldos/liquidaciones/${id}/recibos/${res.idRecibo}`, { replace: true })
  }
  const agregar = useMutation({ mutationFn: (codigo: string) => agregarConceptoRecibo(id, r!.idEmpleado, codigo, r!.numero), onSuccess: alAjustar('Concepto agregado y recibo recalculado.'), onError: (e) => { setBuscando(false); setMsg({ tipo: 'error', texto: mensajeDeError(e) }) } })
  const quitar = useMutation({ mutationFn: (codigo: string) => quitarConceptoRecibo(id, r!.idEmpleado, codigo, r!.numero), onSuccess: alAjustar('Concepto quitado y recibo recalculado.'), onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }) })

  if (isLoading) return <p className="text-sm text-gray-500">Cargando…</p>
  if (isError || !r) return <Mensaje tipo="error">{mensajeDeError(error, 'No se encontró el recibo.')}</Mensaje>

  const abierta = r.estadoLiquidacion === 'LIQUIDACION'   // solo se tocan los recibos en la fase de liquidación
  const editable = abierta && puedeModificar
  const celda = (l: LineaGuardada, campo: 'unidad' | 'importe') => {
    const habilitado = campo === 'unidad' ? l.campoUnidadManual : l.campoImporteManual
    if (!habilitado || !editable) return null
    return (
      <input value={manuales[l.codigo]?.[campo] ?? ''} placeholder={campo === 'unidad' ? 'unidad' : 'importe'}
        onChange={(e) => setManuales({ ...manuales, [l.codigo]: { unidad: manuales[l.codigo]?.unidad ?? '', importe: manuales[l.codigo]?.importe ?? '', [campo]: e.target.value } })}
        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs text-right" />
    )
  }
  const hayCamposManuales = r.lineas.some((l) => l.campoUnidadManual || l.campoImporteManual)
  // aportes y contribuciones sin rubro: el recibo con gráfico los suma en «Otros rubros» hasta que se elija el rubro en Conceptos
  const sinRubro = r.lineas.filter((l) => (l.columna === 'DESCUENTO' || l.columna === 'CONTRIBUCION') && l.aplica && !l.error && l.importe !== 0 && !l.rubroRecibo)
  const hayUnitario = r.lineas.some((l) => l.unitario !== null)   // columna «Valor unidad» (por ejemplo, el valor de la hora extra)

  return (
    <div>
      <Link to={`/sueldos/liquidaciones/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 mb-2"><ArrowLeft size={14} /> Liquidación {r.periodo}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{r.apellido}, {r.nombre}</h1>
          <p className="text-sm text-gray-500">Legajo {r.legajo} · {r.tarea} {r.categoria && `· ${r.convenio}/${r.categoria}`} · Período {r.periodoConNumero} · {r.modalidad ? `Modalidad: ${r.modalidad}` : <span className="text-amber-600" title="El empleado no tenía la modalidad cargada cuando se liquidó este recibo: cargala en su ficha (pestaña ARCA) y volvé a liquidar">Sin modalidad de contratación</span>} {r.estadoLiquidacion === 'CERRADA' && <span className="inline-flex items-center gap-1 ml-2"><Lock size={12} /> Cerrada</span>}{r.estadoLiquidacion === 'CARGA' && <span className="ml-2 text-sky-700">En carga: pasá la liquidación a Liquidación para modificarlo</span>}</p>
        </div>
        <div className="flex gap-2">
        {editable && <BotonSecundario onClick={() => setBuscando(true)} className="inline-flex items-center gap-1.5"><Plus size={15} /> Agregar concepto</BotonSecundario>}
        <BotonSecundario onClick={() => abrirPdfRecibo(id, idRecibo).catch((e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }))} className="inline-flex items-center gap-1.5"><FileText size={15} /> PDF</BotonSecundario>
        <BotonSecundario onClick={() => abrirPdfRecibo(id, idRecibo, true).catch((e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }))} title="Recibo con el formato del Decreto 407/2026: costo total del empleador y gráfico de torta" className="inline-flex items-center gap-1.5"><PieChart size={15} /> PDF con gráfico</BotonSecundario>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Total titulo="Remunerativo" valor={r.remunerativo} /><Total titulo="No remunerativo" valor={r.noRemunerativo} /><Total titulo="Descuentos" valor={r.descuento} />
        <Total titulo="Sueldo neto" valor={r.sueldoNeto} destacado /><Total titulo="Contribuciones" valor={r.contribucion} /><Total titulo="Costo laboral" valor={r.costoLaboral} />
      </div>

      {verCalculo && <VerCalculo idLiquidacion={id} idRecibo={idRecibo} idEmpleado={r.idEmpleado} codigo={verCalculo} importeGuardado={r.lineas.find((l) => l.codigo === verCalculo)?.importe ?? 0} onClose={() => setVerCalculo(null)} />}
      {buscando && <BuscarConcepto yaEnRecibo={new Set(r.lineas.map((l) => l.codigo))} pendiente={agregar.isPending} onElegir={(c) => { setMsg(null); agregar.mutate(c) }} onClose={() => setBuscando(false)} />}
      {msg && <div className="mb-4"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      {sinRubro.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <strong>Sin rubro para el recibo con gráfico</strong> (se suman en «Otros rubros»): {sinRubro.map((l) => `${l.codigo} ${l.descripcion}`).join(', ')}. Elegí el rubro en la ficha de cada concepto (Conceptos → Datos) si corresponde a seguridad social, obra social, INSSJP, ART, sindical o seguro de vida.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 grid sm:grid-cols-4 gap-4 items-end">
        <Campo label="Observaciones" className="sm:col-span-2"><input value={obs} onChange={(e) => setObs(e.target.value)} disabled={!editable} maxLength={500} className={inputCls} /></Campo>
        <Campo label="Liquidación final (fecha)"><input type="date" value={liqFinal} onChange={(e) => setLiqFinal(e.target.value)} disabled={!editable} className={inputCls} /></Campo>
        {editable && <BotonSecundario onClick={() => { setMsg(null); guardarDatos.mutate() }} disabled={guardarDatos.isPending || (obs === (r.observaciones ?? '') && liqFinal === (r.liquidacionFinal ? r.liquidacionFinal.slice(0, 10) : ''))}>Guardar datos</BotonSecundario>}
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {([['conceptos', 'Conceptos'], ['contribuciones', `Contribuciones (${r.lineas.filter((l) => catalogos.solapaDeColumna(l.columna) === 'contribuciones').length})`], ['auxiliares', `Auxiliares (${r.lineas.filter((l) => catalogos.solapaDeColumna(l.columna) === 'auxiliares').length})`], ['novedades', 'Novedades']] as [Pestania, string][]).map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'novedades' && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Novedades del empleado en {r.periodo}</h3>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100"><th className="px-4 py-2 font-medium">Fecha</th><th className="px-4 py-2 font-medium">Novedad</th><th className="px-4 py-2 font-medium text-right">Valor</th></tr></thead>
              <tbody>
                {novedadesDelMes.map((n) => (
                  <tr key={`${n.codigoTipo}|${n.fecha}`} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2">{new Date(n.fecha).toLocaleDateString('es-AR')}</td><td className="px-4 py-2"><span className="font-mono text-xs text-gray-400 mr-2">{n.codigoTipo}</span>{n.descripcion}</td><td className="px-4 py-2 text-right tabular-nums">{n.valor}</td>
                  </tr>
                ))}
                {novedades && novedadesDelMes.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No hay novedades cargadas en este período</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Las novedades se cargan desde la ficha del empleado; las fórmulas de los conceptos las consumen al calcular.</p>
        </section>
      )}
      {tab !== 'novedades' && r.lineas.every((l) => grupos.find((g) => g.clave === l.columna)?.tab !== tab) && (
        <p className="text-sm text-gray-400 mb-6">Este recibo no tiene {tab === 'contribuciones' ? 'contribuciones patronales' : tab === 'auxiliares' ? 'conceptos auxiliares' : 'conceptos'}.</p>
      )}
      {grupos.map((g) => {
        if (g.tab !== tab) return null
        const lineas = r.lineas.filter((l) => l.columna === g.clave)
        if (lineas.length === 0) return null
        return (
          <section key={g.clave} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{g.titulo}</h3>
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Concepto</th><th className="px-4 py-2 font-medium text-right">Unidad</th>{hayUnitario && <th className="px-4 py-2 font-medium text-right">Valor unidad</th>}<th className="px-4 py-2 font-medium text-right">Importe</th>
                  {editable && hayCamposManuales && <th className="px-4 py-2 font-medium text-right">Manual</th>}<th className="px-4 py-2 font-medium">Estado</th><th className="px-2 py-2" />{editable && !g.interno && <th className="px-2 py-2" />}
                </tr></thead>
                <tbody>
                  {lineas.map((l) => (
                    <tr key={l.codigo} className={`border-b border-gray-50 last:border-0 ${!l.aplica ? 'text-gray-400' : ''}`}>
                      <td className="px-4 py-2"><span className="font-mono text-xs text-gray-400 mr-2">{l.codigo}</span>{l.descripcion}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{l.unidad ? formatoNumero(l.unidad) : ''}</td>
                      {hayUnitario && <td className="px-4 py-2 text-right tabular-nums text-gray-600">{l.unitario !== null ? formatoDinero(l.unitario) : ''}</td>}
                      <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(l.importe)}</td>
                      {editable && hayCamposManuales && <td className="px-4 py-2 text-right"><div className="flex justify-end gap-1">{celda(l, 'unidad')}{celda(l, 'importe')}</div></td>}
                      <td className="px-4 py-2">
                        {l.error && <span className="inline-flex items-center gap-1 text-xs text-red-600" title={l.mensaje ?? ''}><XCircle size={13} /> Error <button type="button" onClick={() => setVerCalculo(l.codigo)} className="underline ml-1">¿Por qué?</button></span>}
                        {!l.error && l.advertencia && <span className="inline-flex items-center gap-1 text-xs text-amber-600" title={l.mensaje ?? ''}><AlertTriangle size={13} /> Se bloquea con otros</span>}
                        {!l.error && !l.advertencia && !l.aplica && <span className="text-xs">No aplica</span>}
                        {!l.error && (l.unidadManual !== null || l.importeManual !== null) && <span className="text-xs text-blue-600 ml-2">manual</span>}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button type="button" title="Ver cómo se calculó" aria-label={`Ver cálculo del concepto ${l.codigo}`} onClick={() => setVerCalculo(l.codigo)} className="text-gray-400 hover:text-blue-700"><Calculator size={14} /></button>
                      </td>
                      {editable && !g.interno && (
                        <td className="px-2 py-2 text-right">
                          <button title="Quitar este concepto del recibo" disabled={quitar.isPending}
                            onClick={() => { preguntar(`¿Quitar el concepto ${l.codigo} (${l.descripcion}) de este recibo?`, () => { setMsg(null); quitar.mutate(l.codigo) }, { titulo: 'Quitar', boton: 'Quitar', peligro: true }) }}
                            className="text-red-400 hover:text-red-600 disabled:opacity-50"><Trash2 size={14} /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      <div className="flex flex-wrap items-center gap-4">
        {editable && hayCamposManuales && <BotonPrimario onClick={() => { setMsg(null); guardar.mutate() }} disabled={guardar.isPending}>{guardar.isPending ? 'Recalculando…' : 'Guardar y recalcular'}</BotonPrimario>}
      </div>
    </div>
  )
}
