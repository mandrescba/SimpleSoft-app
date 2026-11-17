import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { crearLiquidacion, getLiquidaciones } from '../../api/liquidaciones'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { formatoDinero } from '../../lib/formato'
import { AYUDA_FILTRO_FECHA, AYUDA_FILTRO_PERIODO, coincideFecha, coincidePeriodo } from '../../lib/filtros'
import { EtiquetaFase, fechaHora, fechasAguinaldo } from '../../components/sueldos/FasesLiquidacion'
import { activos, useCatalogos } from '../../hooks/useCatalogos'
import Modal from '../../components/ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'

const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString('es-AR') : '')
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** De "MM/AAAA" saca el primer y último día del mes (o null si todavía no es un período válido). */
function fechasDelMes(periodo: string) {
  const m = /^(0[1-9]|1[0-2])\/(\d{4})/.exec(periodo.trim())
  if (!m) return null
  const mes = Number(m[1]), anio = Number(m[2])
  return { desde: iso(new Date(anio, mes - 1, 1)), hasta: iso(new Date(anio, mes, 0)) }
}

function NuevaLiquidacion({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const cat = useCatalogos()
  const qc = useQueryClient()
  const hoy = new Date()
  const [periodo, setPeriodo] = useState(`${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`)
  const [tipo, setTipo] = useState('MENSUAL')
  // aguinaldo: se elige año y semestre y el período, las fechas y la fecha de pago salen solos
  const [anio, setAnio] = useState(String(hoy.getFullYear()))
  const [semestre, setSemestre] = useState<'1' | '2'>(hoy.getMonth() < 6 ? '1' : '2')
  // los tipos y si llevan semestre salen del catálogo (el comodín TODAS no es un tipo de liquidación)
  const sac = cat.tipoLiquidacion(tipo)?.usaSemestre ?? false
  const aguinaldo = fechasAguinaldo(Number(anio) || hoy.getFullYear(), semestre === '1' ? 1 : 2)
  const base = sac ? { desde: aguinaldo.desde, hasta: aguinaldo.hasta } : fechasDelMes(periodo)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pago, setPago] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [lugar, setLugar] = useState('')
  const [fDeposito, setFDeposito] = useState('')
  const [pDeposito, setPDeposito] = useState('')
  const [bDeposito, setBDeposito] = useState('')
  const [grupo, setGrupo] = useState('')
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState<string | null>(null)

  // si no se tocaron las fechas, siguen al período (o al semestre)
  const fDesde = desde || base?.desde || ''
  const fHasta = hasta || base?.hasta || ''
  const fPago = pago || (sac ? aguinaldo.pago : '')
  // el período de tipos distintos del mensual lleva el tipo al final (01/2026 SAC) para no chocar con el mensual
  const periodoBase = sac ? aguinaldo.periodo : periodo.trim()
  const textoPeriodo = tipo === 'MENSUAL' ? periodoBase : `${periodoBase.slice(0, 7)} ${tipo}`
  const cambiarSemestre = (s: '1' | '2') => { setSemestre(s); setDesde(''); setHasta(''); setPago('') }

  const crear = useMutation({
    mutationFn: () => crearLiquidacion({ periodo: textoPeriodo, tipo, semestre: sac ? Number(semestre) : null, fecha: fDesde, fechaDesde: fDesde, fechaHasta: fHasta, descripcion: descripcion.trim() || null, fechaPago: fPago || null,
      lugarPago: lugar.trim() || null, fechaDeposito: fDeposito || null, periodoDeposito: pDeposito.trim() || null, bancoDeposito: bDeposito.trim() || null,
      grupoEmpleados: grupo.trim() || null, filtroConceptos: filtro.trim() || null }),
    onSuccess: (l) => { qc.invalidateQueries({ queryKey: ['sueldos', 'liquidaciones'] }); navigate(`/sueldos/liquidaciones/${l.idLiquidacion}`) },
    onError: (e) => setError(mensajeDeError(e)),
  })

  return (
    <Modal titulo="Nueva liquidación" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); crear.mutate() }} className="grid sm:grid-cols-2 gap-4">
        <Campo label="Tipo"><select value={tipo} onChange={(e) => { setTipo(e.target.value); setDesde(''); setHasta(''); setPago('') }} className={inputCls}>{activos(cat.tiposLiquidacion).filter((t) => !t.comodin).map((t) => <option key={t.codigo} value={t.codigo}>{t.descripcion}</option>)}</select></Campo>
        {sac ? (
          <Campo label="Semestre">
            <select value={semestre} onChange={(e) => cambiarSemestre(e.target.value as '1' | '2')} className={inputCls}>
              <option value="1">1º semestre (enero a junio)</option><option value="2">2º semestre (julio a diciembre)</option>
            </select>
          </Campo>
        ) : (
          <Campo label="Período (MM/AAAA)"><input value={periodo} onChange={(e) => { setPeriodo(e.target.value); setDesde(''); setHasta('') }} placeholder="01/2026" className={inputCls} /></Campo>
        )}
        {sac && <Campo label="Año"><input value={anio} onChange={(e) => { setAnio(e.target.value.replace(/\D/g, '').slice(0, 4)); setDesde(''); setHasta(''); setPago('') }} inputMode="numeric" maxLength={4} className={inputCls} /></Campo>}
        {sac && <div className="hidden sm:block" />}
        <Campo label="Desde"><input type="date" value={fDesde} onChange={(e) => setDesde(e.target.value)} className={inputCls} /></Campo>
        <Campo label="Hasta"><input type="date" value={fHasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} /></Campo>
        <Campo label={sac ? 'Fecha de pago (sugerida: 30/06 o 18/12)' : 'Fecha de pago (opcional)'}><input type="date" value={fPago} onChange={(e) => setPago(e.target.value)} className={inputCls} /></Campo>
        <Campo label="Descripción (opcional)"><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputCls} /></Campo>
        <Campo label="Lugar de pago (se imprime en el recibo)"><input value={lugar} onChange={(e) => setLugar(e.target.value)} className={inputCls} /></Campo>
        <div className="hidden sm:block" />
        <fieldset className="sm:col-span-2 grid sm:grid-cols-3 gap-4 border border-gray-200 rounded-lg p-3">
          <legend className="text-xs text-gray-500 px-1">Último depósito de aportes (opcional, sale en el recibo)</legend>
          <Campo label="Fecha"><input type="date" value={fDeposito} onChange={(e) => setFDeposito(e.target.value)} className={inputCls} /></Campo>
          <Campo label="Período"><input value={pDeposito} onChange={(e) => setPDeposito(e.target.value)} placeholder="12/2025" className={inputCls} /></Campo>
          <Campo label="Banco"><input value={bDeposito} onChange={(e) => setBDeposito(e.target.value)} className={inputCls} /></Campo>
        </fieldset>
        <fieldset className="sm:col-span-2 grid sm:grid-cols-2 gap-4 border border-gray-200 rounded-lg p-3">
          <legend className="text-xs text-gray-500 px-1">Liquidación parcial (opcional): en blanco se liquida a todos con todos sus conceptos</legend>
          <Campo label="Solo los empleados del grupo"><input value={grupo} onChange={(e) => setGrupo(e.target.value)} maxLength={20} placeholder="Grupo de la ficha del empleado" className={inputCls} /></Campo>
          <Campo label="Solo estos conceptos"><input value={filtro} onChange={(e) => setFiltro(e.target.value)} maxLength={500} placeholder="Ej.: 100,110 o 500..520" className={inputCls} /></Campo>
        </fieldset>
        <p className="sm:col-span-2 text-xs text-gray-500">Se va a crear <strong>{textoPeriodo || '—'}</strong> en fase de <strong>Carga</strong>: ahí se cargan empleados y novedades. Cuando esté todo, la pasás a <strong>Liquidación</strong> para calcular los recibos.</p>
        {error && <div className="sm:col-span-2"><Mensaje tipo="error">{error}</Mensaje></div>}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={crear.isPending || !base || !fDesde || !fHasta || (sac && anio.length !== 4)}>{crear.isPending ? 'Creando…' : 'Crear'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Liquidaciones de sueldos (un período cada una), con su tipo, fase y datos de cierre. */
export default function LiquidacionesPage() {
  const token = useAuthStore((s) => s.token)
  const cat = useCatalogos()
  const puedeCrear = tienePermiso(permisosDelToken(token), 'SLD', 'crear')
  const [nueva, setNueva] = useState(false)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'liquidaciones'], queryFn: getLiquidaciones })
  const [fPeriodo, setFPeriodo] = useState('')
  const [fFecha, setFFecha] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fEstado, setFEstado] = useState('')
  const filtradas = data?.filter((l) => coincidePeriodo(l.periodo, fPeriodo) && coincideFecha(l.fecha, fFecha) && (!fTipo || l.tipo === fTipo) && (!fEstado || l.estado === fEstado))
  const pag = usePaginado(filtradas)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Liquidaciones</h1>
          <p className="text-gray-500">Cada liquidación es un período y pasa por tres fases: <strong>Carga</strong> (empleados y novedades), <strong>Liquidación</strong> (se calculan los recibos) y <strong>Cerrada</strong>.</p>
        </div>
        {puedeCrear && <BotonPrimario onClick={() => setNueva(true)} className="inline-flex items-center gap-1.5 shrink-0"><Plus size={16} /> Nueva liquidación</BotonPrimario>}
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <Campo label="Período" className="w-60"><input value={fPeriodo} onChange={(e) => setFPeriodo(e.target.value)} placeholder="01/2026*, *2026, 01/2026..03/2026" title={AYUDA_FILTRO_PERIODO} className={inputCls} /></Campo>
        <Campo label="Fecha" className="w-60"><input value={fFecha} onChange={(e) => setFFecha(e.target.value)} placeholder="2026, 6/2026, 1/2026..6/2026" title={AYUDA_FILTRO_FECHA} className={inputCls} /></Campo>
        <Campo label="Tipo" className="w-52"><select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className={inputCls}><option value="">Todos</option>{activos(cat.tiposLiquidacion).filter((t) => !t.comodin).map((t) => <option key={t.codigo} value={t.codigo}>{t.descripcion}</option>)}</select></Campo>
        <Campo label="Fase" className="w-48"><select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className={inputCls}><option value="">Todas</option>{activos(cat.estadosLiquidacion).map((f) => <option key={f.codigo} value={f.codigo}>{f.descripcion}</option>)}</select></Campo>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}

      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2 font-medium">Período</th><th className="px-4 py-2 font-medium">Tipo</th><th className="px-4 py-2 font-medium">Fase</th>
                <th className="px-4 py-2 font-medium">Cierre</th>
                <th className="px-4 py-2 font-medium text-right">Recibos</th><th className="px-4 py-2 font-medium text-right">Neto total</th>
                <th className="px-4 py-2 font-medium text-right">Costo laboral</th><th className="px-4 py-2 font-medium">Pago</th>
              </tr>
            </thead>
            <tbody>
              {pag.filas.map((l) => (
                <tr key={l.idLiquidacion} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium"><Link to={`/sueldos/liquidaciones/${l.idLiquidacion}`} className="text-blue-700 hover:underline">{l.periodo}</Link>
                    {l.descripcion && <div className="text-xs font-normal text-gray-400">{l.descripcion}</div>}</td>
                  <td className="px-4 py-2">{cat.nombreTipoLiquidacion(l.tipo, l.semestre)}</td>
                  <td className="px-4 py-2"><EtiquetaFase estado={l.estado} /></td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {l.estado === 'CERRADA' ? (l.fechaCierre ? <><div>{fechaHora(l.fechaCierre)}</div><div className="text-gray-400">{l.usuarioCierre ?? ''}</div></> : <span className="text-gray-400" title="Se cerró antes de que se guardara este dato">sin registro</span>) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.recibos}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(l.totalNeto)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(l.totalCostoLaboral)}</td>
                  <td className="px-4 py-2">{fecha(l.fechaPago)}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Todavía no hay liquidaciones</td></tr>}
              {data.length > 0 && filtradas?.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Ninguna liquidación coincide con el filtro</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
      {nueva && <NuevaLiquidacion onClose={() => setNueva(false)} />}
    </div>
  )
}
