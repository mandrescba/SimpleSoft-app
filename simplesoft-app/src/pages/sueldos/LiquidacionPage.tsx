import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, History, PieChart, Trash2, XCircle } from 'lucide-react'
import { abrirPdfRecibo, abrirPdfRecibosCosto, cerrarLiquidacion, eliminarLiquidacion, eliminarRecibo, getHistorialLiquidacion, getLiquidacion, liquidar, modificarLiquidacion, pasarALiquidacion, reabrirLiquidacion, volverACarga } from '../../api/liquidaciones'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { formatoDinero } from '../../lib/formato'
import { LiquidarConOpciones, NuevoReciboNumerado } from '../../components/sueldos/OpcionesLiquidacion'
import { EtiquetaFase, PasosFase, fechaHora } from '../../components/sueldos/FasesLiquidacion'
import { useCatalogos } from '../../hooks/useCatalogos'
import Modal from '../../components/ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import type { LiquidacionResumen, LiquidarResponse } from '../../types/sueldos'
import { preguntar } from '../../components/ui/Confirmar'

const dia = (s: string | null) => (s ? s.slice(0, 10) : '')

/** Datos que se imprimen en el recibo: descripción, fecha y lugar de pago, y último depósito de aportes. */
function DatosDePago({ l, onClose, onGuardado }: { l: LiquidacionResumen; onClose: () => void; onGuardado: () => void }) {
  const [descripcion, setDescripcion] = useState(l.descripcion ?? '')
  const [pago, setPago] = useState(dia(l.fechaPago))
  const [lugar, setLugar] = useState(l.lugarPago ?? '')
  const [fDep, setFDep] = useState(dia(l.fechaDeposito))
  const [pDep, setPDep] = useState(l.periodoDeposito ?? '')
  const [bDep, setBDep] = useState(l.bancoDeposito ?? '')
  const [grupo, setGrupo] = useState(l.grupoEmpleados ?? '')
  const [filtro, setFiltro] = useState(l.filtroConceptos ?? '')
  const [error, setError] = useState<string | null>(null)
  const guardar = useMutation({
    mutationFn: () => modificarLiquidacion(l.idLiquidacion, {
      descripcion: descripcion.trim() || null, fechaPago: pago || null, lugarPago: lugar.trim() || null,
      fechaDeposito: fDep || null, periodoDeposito: pDep.trim() || null, bancoDeposito: bDep.trim() || null,
      grupoEmpleados: grupo.trim() || null, filtroConceptos: filtro.trim() || null,
    }),
    onSuccess: () => { onGuardado(); onClose() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <Modal titulo="Datos del recibo" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="grid sm:grid-cols-2 gap-4">
        <Campo label="Descripción (se imprime en el recibo)" className="sm:col-span-2"><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputCls} /></Campo>
        <Campo label="Fecha de pago"><input type="date" value={pago} onChange={(e) => setPago(e.target.value)} className={inputCls} /></Campo>
        <Campo label="Lugar de pago"><input value={lugar} onChange={(e) => setLugar(e.target.value)} className={inputCls} /></Campo>
        <fieldset className="sm:col-span-2 grid sm:grid-cols-3 gap-4 border border-gray-200 rounded-lg p-3">
          <legend className="text-xs text-gray-500 px-1">Último depósito de aportes</legend>
          <Campo label="Fecha"><input type="date" value={fDep} onChange={(e) => setFDep(e.target.value)} className={inputCls} /></Campo>
          <Campo label="Período"><input value={pDep} onChange={(e) => setPDep(e.target.value)} placeholder="12/2025" className={inputCls} /></Campo>
          <Campo label="Banco"><input value={bDep} onChange={(e) => setBDep(e.target.value)} className={inputCls} /></Campo>
        </fieldset>
        <fieldset className="sm:col-span-2 grid sm:grid-cols-2 gap-4 border border-gray-200 rounded-lg p-3">
          <legend className="text-xs text-gray-500 px-1">Liquidación parcial (en blanco = todos, con todos sus conceptos)</legend>
          <Campo label="Solo los empleados del grupo"><input value={grupo} onChange={(e) => setGrupo(e.target.value)} maxLength={20} className={inputCls} /></Campo>
          <Campo label="Solo estos conceptos"><input value={filtro} onChange={(e) => setFiltro(e.target.value)} maxLength={500} placeholder="Ej.: 100,110 o 500..520" className={inputCls} /></Campo>
          <p className="sm:col-span-2 text-xs text-gray-400">Los cambios se aplican la próxima vez que liquides. Para una liquidación solo de SAC, poné los códigos de los conceptos de SAC.</p>
        </fieldset>
        <p className="sm:col-span-2 text-xs text-gray-500">El PDF toma estos datos de la liquidación, así que también se ven en los recibos ya liquidados.</p>
        {error && <div className="sm:col-span-2"><Mensaje tipo="error">{error}</Mensaje></div>}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Reabrir una liquidación cerrada: el motivo es obligatorio y queda en el historial. */
function ReabrirModal({ periodo, pendiente, onClose, onConfirmar }: { periodo: string; pendiente: boolean; onClose: () => void; onConfirmar: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState('')
  return (
    <Modal titulo={`Reabrir la liquidación ${periodo}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onConfirmar(motivo.trim()) }} className="space-y-4">
        <p className="text-sm text-gray-600">La liquidación vuelve a la fase de <strong>Liquidación</strong> y se puede modificar. Se borran la fecha y el usuario de cierre; el historial conserva quién la cerró y quién la reabrió.</p>
        <Campo label="Motivo de la reapertura (obligatorio)">
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={300} placeholder="Ej.: falta cargar una novedad de horas extras" className={inputCls} autoFocus />
        </Campo>
        <div className="flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={pendiente || motivo.trim().length < 5}>{pendiente ? 'Reabriendo…' : 'Reabrir'}</BotonPrimario>
        </div>
        {motivo.trim().length > 0 && motivo.trim().length < 5 && <p className="text-xs text-gray-400">Contá un poco más: al menos 5 letras.</p>}
      </form>
    </Modal>
  )
}

/** Una liquidación: sus fases, sus recibos, y las acciones de pasar de fase, liquidar, cerrar, reabrir y borrar. */
export default function LiquidacionPage() {
  const cat = useCatalogos()
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const puede = (a: string) => tienePermiso(permisos, 'SLD', a)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'liquidacion', id], queryFn: () => getLiquidacion(id) })
  const [resultado, setResultado] = useState<LiquidarResponse | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [datos, setDatos] = useState(false)
  const [opciones, setOpciones] = useState(false)
  const [nuevoRecibo, setNuevoRecibo] = useState(false)
  const [reabriendo, setReabriendo] = useState(false)
  const [verHistorial, setVerHistorial] = useState(false)
  const { data: historial } = useQuery({ queryKey: ['sueldos', 'liquidacion', id, 'historial'], queryFn: () => getHistorialLiquidacion(id), enabled: verHistorial })

  const refrescar = () => { qc.invalidateQueries({ queryKey: ['sueldos', 'liquidacion', id] }); qc.invalidateQueries({ queryKey: ['sueldos', 'liquidaciones'] }) }   // incluye el historial
  const alFallar = (e: unknown) => setAviso({ tipo: 'error', texto: mensajeDeError(e) })

  const calcular = useMutation({ mutationFn: () => liquidar(id), onSuccess: (r) => { setResultado(r); setAviso(null); refrescar() }, onError: alFallar })
  const pasar = useMutation({ mutationFn: () => pasarALiquidacion(id), onSuccess: () => { setAviso({ tipo: 'ok', texto: 'La liquidación pasó a la fase de Liquidación: ya se pueden calcular los recibos. Las novedades de esos meses quedaron bloqueadas.' }); refrescar() }, onError: alFallar })
  const volver = useMutation({ mutationFn: () => volverACarga(id), onSuccess: () => { setAviso({ tipo: 'ok', texto: 'La liquidación volvió a Carga: se pueden corregir las novedades. Los recibos ya calculados quedan; recalculalos al volver a Liquidación.' }); refrescar() }, onError: alFallar })
  const cerrar = useMutation({ mutationFn: () => cerrarLiquidacion(id), onSuccess: () => { setAviso({ tipo: 'ok', texto: 'Liquidación cerrada.' }); refrescar() }, onError: alFallar })
  const reabrir = useMutation({ mutationFn: (motivo: string) => reabrirLiquidacion(id, motivo), onSuccess: () => { setReabriendo(false); setAviso({ tipo: 'ok', texto: 'Liquidación reabierta: volvió a la fase de Liquidación.' }); refrescar() }, onError: (e) => { setReabriendo(false); alFallar(e) } })
  const borrar = useMutation({ mutationFn: () => eliminarLiquidacion(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'liquidaciones'] }); navigate('/sueldos/liquidaciones', { replace: true }) }, onError: alFallar })
  const borrarRecibo = useMutation({ mutationFn: (idRecibo: number) => eliminarRecibo(id, idRecibo), onSuccess: refrescar, onError: alFallar })

  if (isLoading) return <p className="text-sm text-gray-500">Cargando…</p>
  if (isError || !data) return <Mensaje tipo="error">{mensajeDeError(error, 'No se encontró la liquidación.')}</Mensaje>

  const { liquidacion: l, recibos } = data
  const enCarga = l.estado === 'CARGA'
  const enLiq = l.estado === 'LIQUIDACION'
  const cerrada = l.estado === 'CERRADA'
  const total = (f: (r: (typeof recibos)[number]) => number) => recibos.reduce((s, r) => s + f(r), 0)

  return (
    <div>
      <Link to="/sueldos/liquidaciones" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 mb-2"><ArrowLeft size={14} /> Liquidaciones</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Liquidación {l.periodo}</h1>
          <p className="text-gray-500 text-sm">
            {cat.nombreTipoLiquidacion(l.tipo, l.semestre)} · {new Date(l.fechaDesde).toLocaleDateString('es-AR')} al {new Date(l.fechaHasta).toLocaleDateString('es-AR')}
            {l.descripcion && ` · ${l.descripcion}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {enCarga && puede('modificar') && (
            <BotonPrimario disabled={pasar.isPending} onClick={() => { preguntar('Al pasar a Liquidación las novedades de esos meses quedan bloqueadas y se pueden calcular los recibos. ¿Pasar a Liquidación?', () => pasar.mutate(), { titulo: 'Pasar a Liquidación', boton: 'Pasar a Liquidación' })}}>
              {pasar.isPending ? 'Pasando…' : 'Pasar a liquidación'}
            </BotonPrimario>
          )}
          {enLiq && puede('modificar') && (
            <BotonPrimario disabled={calcular.isPending}
              onClick={() => { if (recibos.length === 0) calcular.mutate(); else preguntar('Se vuelven a calcular los recibos de todos los empleados (los valores manuales que cargaste se conservan). ¿Seguimos?', () => calcular.mutate(), { titulo: 'Recalcular recibos', boton: 'Recalcular' })}}>
              {calcular.isPending ? 'Liquidando…' : recibos.length ? 'Volver a liquidar' : 'Liquidar'}
            </BotonPrimario>
          )}
          {enLiq && puede('modificar') && <BotonSecundario onClick={() => setOpciones(true)}>Liquidar con opciones</BotonSecundario>}
          {enLiq && puede('modificar') && <BotonSecundario onClick={() => setNuevoRecibo(true)}>Nuevo recibo</BotonSecundario>}
          {recibos.length > 0 && <BotonSecundario title="Todos los recibos en un solo PDF con el formato del Decreto 407/2026 (costo total del empleador y gráfico)" onClick={() => abrirPdfRecibosCosto(id).catch((e) => setAviso({ tipo: 'error', texto: mensajeDeError(e) }))}>Imprimir todos con gráfico</BotonSecundario>}
          {enLiq && puede('modificar') && recibos.length > 0 && (
            <BotonSecundario disabled={cerrar.isPending} onClick={() => { preguntar('Al cerrar la liquidación los recibos quedan fijos y se registran tu usuario y la fecha de cierre. Para tocarla de nuevo hay que reabrirla con un motivo. ¿Cerrar?', () => cerrar.mutate(), { titulo: 'Cerrar la liquidación', boton: 'Cerrar' })}}>Cerrar</BotonSecundario>
          )}
          {enLiq && puede('modificar') && (
            <BotonSecundario disabled={volver.isPending} onClick={() => { preguntar('Vuelve a la fase de Carga para corregir novedades. Los recibos calculados quedan, pero hay que recalcularlos. ¿Volver a Carga?', () => volver.mutate(), { titulo: 'Volver a Carga', boton: 'Volver a Carga' })}}>Volver a carga</BotonSecundario>
          )}
          {!cerrada && puede('modificar') && <BotonSecundario onClick={() => setDatos(true)}>Datos del recibo</BotonSecundario>}
          {cerrada && puede('eliminar') && <BotonSecundario onClick={() => setReabriendo(true)}>Reabrir</BotonSecundario>}
          {!cerrada && puede('eliminar') && (
            <BotonSecundario disabled={borrar.isPending} className="text-red-600" onClick={() => { preguntar(`¿Borrar la liquidación ${l.periodo} con sus ${recibos.length} recibos? No se puede deshacer.`, () => borrar.mutate(), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}}>Borrar</BotonSecundario>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4">
        <PasosFase estado={l.estado} />
        <p className="text-xs text-gray-500 mt-2">
          {enCarga && 'Carga: se cargan empleados y novedades. Cuando esté todo, pasala a Liquidación para calcular los recibos.'}
          {enLiq && 'Liquidación: se calculan y revisan los recibos. Las novedades de estos meses están bloqueadas; si hay que corregir una, volvé a Carga.'}
          {cerrada && (l.fechaCierre
            ? <>Cerrada el <strong>{fechaHora(l.fechaCierre)}</strong>{l.usuarioCierre && <> por <strong>{l.usuarioCierre}</strong></>}. No se puede modificar: para tocarla hay que reabrirla indicando el motivo.</>
            : 'Cerrada. No se puede modificar: para tocarla hay que reabrirla indicando el motivo. (Se cerró antes de que se registraran la fecha y el usuario de cierre.)')}
        </p>
        <button type="button" onClick={() => setVerHistorial((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"><History size={12} /> {verHistorial ? 'Ocultar el historial' : 'Ver el historial de fases'}</button>
        {verHistorial && (
          <table className="mt-2 w-full text-xs">
            <thead><tr className="text-left text-gray-400"><th className="py-1 pr-3 font-medium">Cuándo</th><th className="py-1 pr-3 font-medium">Cambio</th><th className="py-1 pr-3 font-medium">Quién</th><th className="py-1 font-medium">Motivo</th></tr></thead>
            <tbody>
              {historial?.map((h, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-1 pr-3 whitespace-nowrap">{fechaHora(h.fecha)}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{h.estadoAnterior ? <>{cat.nombreEstado(h.estadoAnterior)} → <EtiquetaFase estado={h.estadoNuevo as typeof l.estado} /></> : <>Creada en <EtiquetaFase estado={h.estadoNuevo as typeof l.estado} /></>}</td>
                  <td className="py-1 pr-3">{h.usuario ?? '—'}</td>
                  <td className="py-1 text-gray-600">{h.motivo ?? ''}</td>
                </tr>
              ))}
              {historial && historial.length === 0 && <tr><td colSpan={4} className="py-2 text-gray-400">Sin movimientos registrados (es anterior al historial).</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {reabriendo && <ReabrirModal periodo={l.periodo} pendiente={reabrir.isPending} onClose={() => setReabriendo(false)} onConfirmar={(m) => reabrir.mutate(m)} />}
      {opciones && <LiquidarConOpciones idLiquidacion={id} onClose={() => setOpciones(false)} onResultado={(r) => { setResultado(r); setAviso(null); refrescar() }} />}
      {nuevoRecibo && <NuevoReciboNumerado idLiquidacion={id} onClose={() => setNuevoRecibo(false)} onCreado={(idRecibo) => { setNuevoRecibo(false); refrescar(); navigate(`/sueldos/liquidaciones/${id}/recibos/${idRecibo}`) }} />}
      {datos && <DatosDePago l={l} onClose={() => setDatos(false)} onGuardado={() => { setAviso({ tipo: 'ok', texto: 'Datos guardados.' }); refrescar() }} />}
      {(l.grupoEmpleados || l.filtroConceptos) && (
        <p className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
          Liquidación parcial:{l.grupoEmpleados && <> solo el grupo <strong>{l.grupoEmpleados}</strong>.</>}{l.filtroConceptos && <> Solo los conceptos <strong>{l.filtroConceptos}</strong>.</>}
        </p>
      )}
      {aviso && <div className="mb-4"><Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje></div>}

      {resultado && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex flex-wrap gap-4 text-sm mb-2">
            <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={15} /> {resultado.ok} liquidados</span>
            {resultado.omitidos > 0 && <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle size={15} /> {resultado.omitidos} omitidos</span>}
            {resultado.errores > 0 && <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={15} /> {resultado.errores} con error</span>}
          </div>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {resultado.detalle.filter((d) => d.estado !== 'OK' || d.conErrores).map((d) => (
              <li key={d.legajo}><strong>{d.legajo}</strong> {d.nombre}: {d.mensaje}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Legajo</th><th className="px-4 py-2 font-medium">Empleado</th>
              <th className="px-4 py-2 font-medium text-right">Remunerativo</th><th className="px-4 py-2 font-medium text-right">Descuentos</th>
              <th className="px-4 py-2 font-medium text-right">Neto</th><th className="px-4 py-2 font-medium text-right">Costo laboral</th><th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {recibos.map((r) => (
              <tr key={r.idRecibo} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{r.legajo}</td>
                <td className="px-4 py-2">
                  <Link to={`/sueldos/liquidaciones/${id}/recibos/${r.idRecibo}`} className="text-blue-700 hover:underline">{r.apellido}, {r.nombre}</Link>
                  {r.numero > 1 && <span className="ml-2 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5">recibo {r.numero}</span>}
                  {r.conErrores && <XCircle size={13} className="inline ml-2 text-red-500" aria-label="Con errores" />}
                  {!r.conErrores && r.conAdvertencias && <AlertTriangle size={13} className="inline ml-2 text-amber-500" aria-label="Con advertencias" />}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(r.remunerativo + r.noRemunerativo)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(r.descuento)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{formatoDinero(r.sueldoNeto)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-500">{formatoDinero(r.costoLaboral)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button title="Ver el PDF" onClick={() => abrirPdfRecibo(id, r.idRecibo).catch((e) => setAviso({ tipo: 'error', texto: mensajeDeError(e) }))} className="text-gray-500 hover:text-blue-700 mr-2"><FileText size={15} /></button>
                  <button title="Ver el PDF con gráfico (Decreto 407/2026)" onClick={() => abrirPdfRecibo(id, r.idRecibo, true).catch((e) => setAviso({ tipo: 'error', texto: mensajeDeError(e) }))} className="text-gray-500 hover:text-blue-700 mr-2"><PieChart size={15} /></button>
                  {!cerrada && puede('eliminar') && <button title="Borrar el recibo" onClick={() => { preguntar(`¿Borrar el recibo${r.numero > 1 ? ` ${r.numero}` : ''} de ${r.apellido}?`, () => borrarRecibo.mutate(r.idRecibo), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} className="text-red-500"><Trash2 size={14} /></button>}
                </td>
              </tr>
            ))}
            {recibos.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Todavía no se liquidó. {enCarga && puede('modificar') ? 'Primero pasá la liquidación a la fase de Liquidación.' : enLiq && puede('modificar') ? 'Tocá "Liquidar" para calcular los recibos.' : ''}</td></tr>}
          </tbody>
          {recibos.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-sm">
                <td className="px-4 py-2" colSpan={2}>Totales ({recibos.length} {recibos.length === 1 ? 'recibo' : 'recibos'})</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(total((r) => r.remunerativo + r.noRemunerativo))}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(total((r) => r.descuento))}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(total((r) => r.sueldoNeto))}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(total((r) => r.costoLaboral))}</td><td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">Los conceptos que acumulan (como Ganancias) leen los recibos de los meses anteriores: liquidá los meses en orden.</p>
    </div>
  )
}
