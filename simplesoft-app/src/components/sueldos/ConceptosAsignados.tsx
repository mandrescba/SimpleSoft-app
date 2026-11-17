import { activos, useCatalogos } from '../../hooks/useCatalogos'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { getConceptos } from '../../api/sueldos'
import { mensajeDeError } from '../../api/axios'
import type { RenglonForm } from '../../api/configuracion'
import type { RenglonConvenio } from '../../types/sueldos'
import { formatoDinero, formatoNumero } from '../../lib/formato'
import Modal from '../ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../ui/Campos'
import { preguntar } from '../ui/Confirmar'

// En qué liquidaciones aparece un concepto asignado: los tipos de liquidación del catálogo, con TODAS (comodín) incluido.

const dia = (s: string | null) => (s ? s.slice(0, 10) : '')
export const fechaCorta = (s: string | null) => (s ? new Date(s).toLocaleDateString('es-AR') : 'sin fin')
const num = (t: string) => (t.trim() === '' ? null : Number(t.replace(',', '.')))
const txt = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

/** De dónde se leen, se guardan y se quitan los conceptos (un grupo, los generales, los de un empleado). */
export interface FuenteConceptos {
  /** Clave de la consulta (React Query). */
  clave: unknown[]
  cargar: () => Promise<RenglonConvenio[]>
  guardar: (d: RenglonForm) => Promise<unknown>
  quitar: (codigo: string, tipo: string) => Promise<unknown>
  /** Otras consultas que cambian cuando se agrega o quita un concepto (contadores, listados). */
  tambienRefrescar?: unknown[][]
}

interface Edicion { codigo: string; tipo: string; unidad: string; importe: string; desde: string; hasta: string; nuevo: boolean }

/**
 * Lista de conceptos con unidad, importe, vigencia y tipo de liquidación propios, con alta, modificación y baja. La usan los grupos de
 * conceptos, los conceptos generales de la empresa y los conceptos propios de cada empleado.
 */
export default function ConceptosAsignados({ fuente, puede, ayuda, vacio, titulo, alCambiar }:
  { fuente: FuenteConceptos; puede: boolean; ayuda: string; vacio: string; titulo: string; alCambiar?: () => void }) {
  const qc = useQueryClient()
  const { data: renglones, isLoading, isError, error: errorCarga } = useQuery({ queryKey: fuente.clave, queryFn: fuente.cargar })
  const { data: catalogo } = useQuery({ queryKey: ['sueldos', 'conceptos'], queryFn: getConceptos })
  const cat = useCatalogos()
  const [agregando, setAgregando] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [edit, setEdit] = useState<Edicion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: fuente.clave })
    fuente.tambienRefrescar?.forEach((k) => qc.invalidateQueries({ queryKey: k }))
    alCambiar?.()
  }
  const alFallar = (e: unknown) => setError(mensajeDeError(e))
  const guardar = useMutation({
    mutationFn: () => fuente.guardar({ codigo: edit!.codigo, tipoLiquidacion: edit!.tipo, unidad: num(edit!.unidad), importe: num(edit!.importe), vigenciaDesde: edit!.desde || null, vigenciaHasta: edit!.hasta || null, orden: null }),
    onSuccess: () => { setEdit(null); setAgregando(false); setError(null); refrescar() },
    onError: alFallar,
  })
  const quitar = useMutation({ mutationFn: (r: { codigo: string; tipo: string }) => fuente.quitar(r.codigo, r.tipo), onSuccess: refrescar, onError: alFallar })

  // al agregar solo se ofrecen los conceptos que todavía no están
  const disponibles = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    const yaEsta = new Set((renglones ?? []).map((r) => r.codigo))
    return (catalogo ?? []).filter((x) => x.activo && !cat.esCalculoInterno(x.columna) && !yaEsta.has(x.codigo) && (!f || x.codigo.toLowerCase().includes(f) || x.descripcion.toLowerCase().includes(f)))
  }, [catalogo, renglones, filtro, cat])

  const cerrar = () => { setEdit(null); setAgregando(false) }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs text-gray-500">{ayuda}</p>
        {puede && <BotonPrimario onClick={() => { setError(null); setAgregando(true) }} className="inline-flex items-center gap-1.5 shrink-0"><Plus size={16} /> Agregar concepto</BotonPrimario>}
      </div>
      {isError && <div className="mb-3"><Mensaje tipo="error">{mensajeDeError(errorCarga)}</Mensaje></div>}
      {error && !edit && <div className="mb-3"><Mensaje tipo="error">{error}</Mensaje></div>}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 font-medium">Concepto</th><th className="px-4 py-2 font-medium">Descripción</th><th className="px-4 py-2 font-medium">Liquidación</th>
            <th className="px-4 py-2 font-medium text-right">Unidad</th><th className="px-4 py-2 font-medium text-right">Importe</th><th className="px-4 py-2 font-medium">Vigencia</th><th className="px-4 py-2" />
          </tr></thead>
          <tbody>
            {renglones?.map((r) => (
              <tr key={`${r.codigo}|${r.tipoLiquidacion}`} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{r.codigo}</td><td className="px-4 py-2">{r.descripcion}</td><td className="px-4 py-2 text-gray-500">{cat.nombreTipoLiquidacion(r.tipoLiquidacion)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.unidad === null ? '' : formatoNumero(r.unidad)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.importe === null ? '' : formatoDinero(r.importe)}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{r.vigenciaDesde || r.vigenciaHasta ? `${r.vigenciaDesde ? fechaCorta(r.vigenciaDesde) : '…'} a ${fechaCorta(r.vigenciaHasta)}` : ''}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">{puede && <>
                  <button title="Modificar los valores propios" onClick={() => { setError(null); setEdit({ codigo: r.codigo, tipo: r.tipoLiquidacion, unidad: txt(r.unidad), importe: txt(r.importe), desde: dia(r.vigenciaDesde), hasta: dia(r.vigenciaHasta), nuevo: false }) }} className="text-gray-500 hover:text-blue-700 mr-2"><Pencil size={14} /></button>
                  <button title="Quitar" onClick={() => { setError(null); preguntar(`¿Quitar el concepto ${r.codigo}?`, () => quitar.mutate({ codigo: r.codigo, tipo: r.tipoLiquidacion }), { titulo: 'Quitar', boton: 'Quitar', peligro: true })}} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </>}</td>
              </tr>
            ))}
            {!isLoading && renglones?.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{vacio}</td></tr>}
          </tbody>
        </table>
      </div>

      {agregando && !edit && (
        <Modal titulo={titulo} onClose={cerrar}>
          <input autoFocus value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por código o descripción" className={`${inputCls} mb-3`} />
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {disponibles.map((x) => (
              <li key={x.codigo}><button type="button" onClick={() => setEdit({ codigo: x.codigo, tipo: 'TODAS', unidad: '', importe: '', desde: '', hasta: '', nuevo: true })} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50">
                <span className="font-mono text-xs text-gray-400 mr-2">{x.codigo}</span>{x.descripcion}</button></li>
            ))}
            {disponibles.length === 0 && <li className="px-3 py-4 text-sm text-gray-400 text-center">No hay conceptos para agregar</li>}
          </ul>
        </Modal>
      )}
      {edit && (
        <Modal titulo={`Concepto ${edit.codigo}`} onClose={cerrar}>
          <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="grid sm:grid-cols-2 gap-4">
            <Campo label="Aparece en" className="sm:col-span-2">
              <select value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value })} disabled={!edit.nuevo} className={inputCls}>
                {activos(cat.tiposLiquidacion).map((t) => <option key={t.codigo} value={t.codigo}>{t.descripcion}</option>)}
                {!activos(cat.tiposLiquidacion).some((t) => t.codigo === edit.tipo) && <option value={edit.tipo}>{cat.nombreTipoLiquidacion(edit.tipo)}</option>}
              </select>
            </Campo>
            <Campo label="Unidad (opcional)"><input value={edit.unidad} onChange={(e) => setEdit({ ...edit, unidad: e.target.value })} inputMode="decimal" className={inputCls} /></Campo>
            <Campo label="Importe (opcional)"><input value={edit.importe} onChange={(e) => setEdit({ ...edit, importe: e.target.value })} inputMode="decimal" className={inputCls} /></Campo>
            <Campo label="Vigente desde"><input type="date" value={edit.desde} onChange={(e) => setEdit({ ...edit, desde: e.target.value })} className={inputCls} /></Campo>
            <Campo label="Vigente hasta"><input type="date" value={edit.hasta} onChange={(e) => setEdit({ ...edit, hasta: e.target.value })} className={inputCls} /></Campo>
            <p className="sm:col-span-2 text-xs text-gray-400">Sin fechas el concepto siempre está vigente. Una unidad o un importe cargados acá reemplazan a los del concepto.</p>
            {error && <div className="sm:col-span-2"><Mensaje tipo="error">{error}</Mensaje></div>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <BotonSecundario type="button" onClick={cerrar}>Cancelar</BotonSecundario>
              <BotonPrimario type="submit" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</BotonPrimario>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
