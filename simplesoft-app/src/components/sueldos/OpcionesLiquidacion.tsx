import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { crearReciboNumerado, getLiquidaciones, liquidar } from '../../api/liquidaciones'
import { getGrupos } from '../../api/grupos'
import { getConceptos } from '../../api/sueldos'
import { getEmpleados } from '../../api/empleados'
import { mensajeDeError } from '../../api/axios'
import type { LiquidarResponse } from '../../types/sueldos'
import { useCatalogos } from '../../hooks/useCatalogos'
import Modal from '../ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../ui/Campos'

/** Liquidar a todos con opciones: tomar otro período como base y/o usar los conceptos de un grupo. */
export function LiquidarConOpciones({ idLiquidacion, onClose, onResultado }: { idLiquidacion: number; onClose: () => void; onResultado: (r: LiquidarResponse) => void }) {
  const { data: liquidaciones } = useQuery({ queryKey: ['sueldos', 'liquidaciones'], queryFn: getLiquidaciones })
  const { data: grupos } = useQuery({ queryKey: ['sueldos', 'grupos'], queryFn: getGrupos })
  const [usarBase, setUsarBase] = useState(false)
  const [base, setBase] = useState('')
  const [usarGrupo, setUsarGrupo] = useState(false)
  const [grupo, setGrupo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const otras = (liquidaciones ?? []).filter((l) => l.idLiquidacion !== idLiquidacion)
  const ejecutar = useMutation({
    mutationFn: () => liquidar(idLiquidacion, { duplicarDe: usarBase && base ? Number(base) : undefined, idGrupoConceptos: usarGrupo && grupo ? Number(grupo) : undefined }),
    onSuccess: (r) => { onResultado(r); onClose() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  const completo = (!usarBase || !!base) && (!usarGrupo || !!grupo) && (usarBase || usarGrupo)
  return (
    <Modal titulo="Liquidar con opciones" onClose={onClose} ancho="max-w-xl">
      <div className="grid gap-5">
        <div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-800"><input type="checkbox" checked={usarBase} onChange={(e) => setUsarBase(e.target.checked)} /> Tomar otro período como base (duplicar)</label>
          <p className="text-xs text-gray-500 mt-1 mb-2">Se liquida a los mismos empleados que tenían recibo en ese período y se copian sus valores manuales (horas, días, importes) y los conceptos que se hayan agregado o quitado a mano. Lo que este recibo ya tenga cargado no se pisa.</p>
          {usarBase && (
            <select value={base} onChange={(e) => setBase(e.target.value)} className={inputCls}>
              <option value="">— elegí el período base —</option>
              {otras.map((l) => <option key={l.idLiquidacion} value={l.idLiquidacion}>{l.periodo} · {l.recibos} recibos</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-800"><input type="checkbox" checked={usarGrupo} onChange={(e) => setUsarGrupo(e.target.checked)} /> Usar los conceptos de un grupo</label>
          <p className="text-xs text-gray-500 mt-1 mb-2">Todos los recibos se arman con los conceptos de ese grupo (por ejemplo, una liquidación de vacaciones) en lugar de los que le corresponden a cada empleado. En este caso no se aplican los conceptos agregados o quitados a mano.</p>
          {usarGrupo && (
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className={inputCls}>
              <option value="">— elegí el grupo —</option>
              {grupos?.map((g) => <option key={g.idGrupoConceptos} value={g.idGrupoConceptos}>{g.codigo} — {g.descripcion} ({g.conceptos} conceptos)</option>)}
            </select>
          )}
        </div>
        <p className="text-xs text-gray-400">Los recibos que ya estén liquidados se reemplazan (los recibos numerados adicionales no se tocan).</p>
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <div className="flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="button" disabled={!completo || ejecutar.isPending} onClick={() => { setError(null); ejecutar.mutate() }}>{ejecutar.isPending ? 'Liquidando…' : 'Liquidar'}</BotonPrimario>
        </div>
      </div>
    </Modal>
  )
}

/** Recibo numerado adicional de un empleado (por ejemplo, un recibo solo de vacaciones). */
export function NuevoReciboNumerado({ idLiquidacion, onClose, onCreado }: { idLiquidacion: number; onClose: () => void; onCreado: (idRecibo: number) => void }) {
  const cat = useCatalogos()
  const { data: empleados } = useQuery({ queryKey: ['sueldos', 'empleados', '', false], queryFn: () => getEmpleados('', false) })
  const { data: catalogo } = useQuery({ queryKey: ['sueldos', 'conceptos'], queryFn: getConceptos })
  const [empleado, setEmpleado] = useState('')
  const [conAutomaticos, setConAutomaticos] = useState(false)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState<string | null>(null)
  const crear = useMutation({
    mutationFn: () => crearReciboNumerado(idLiquidacion, Number(empleado), { conAutomaticos, codigos: elegidos }),
    onSuccess: (r) => { if (r.idRecibo) onCreado(r.idRecibo) },
    onError: (e) => setError(mensajeDeError(e)),
  })
  const disponibles = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    return (catalogo ?? []).filter((c) => c.activo && !cat.esCalculoInterno(c.columna) && (!f || c.codigo.toLowerCase().includes(f) || c.descripcion.toLowerCase().includes(f)))
  }, [catalogo, filtro, cat])
  const alternar = (codigo: string) => setElegidos((e) => (e.includes(codigo) ? e.filter((x) => x !== codigo) : [...e, codigo]))
  const valido = !!empleado && (conAutomaticos || elegidos.length > 0)
  return (
    <Modal titulo="Nuevo recibo del empleado" onClose={onClose} ancho="max-w-xl">
      <div className="grid gap-4">
        <p className="text-sm text-gray-600">Crea otro recibo del mismo empleado en esta liquidación (se numera 2, 3…): por ejemplo uno solo con las vacaciones. El recibo principal no se toca.</p>
        <Campo label="Empleado">
          <select value={empleado} onChange={(e) => setEmpleado(e.target.value)} className={inputCls}>
            <option value="">— elegí el empleado —</option>
            {empleados?.map((e) => <option key={e.idEmpleado} value={e.idEmpleado}>{e.legajo} · {e.apellido}, {e.nombre}</option>)}
          </select>
        </Campo>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={conAutomaticos} onChange={(e) => setConAutomaticos(e.target.checked)} /> Traer también los conceptos automáticos del empleado</label>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Conceptos del recibo {elegidos.length > 0 && <span className="font-normal text-gray-500">({elegidos.length} elegidos: {elegidos.join(', ')})</span>}</p>
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por código o descripción" className={`${inputCls} mb-2`} />
          <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {disponibles.map((c) => (
              <li key={c.codigo}>
                <label className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50 cursor-pointer">
                  <input type="checkbox" checked={elegidos.includes(c.codigo)} onChange={() => alternar(c.codigo)} />
                  <span className="font-mono text-xs text-gray-400">{c.codigo}</span>{c.descripcion}
                </label>
              </li>
            ))}
            {disponibles.length === 0 && <li className="px-3 py-4 text-sm text-gray-400 text-center">No hay conceptos</li>}
          </ul>
          {!conAutomaticos && elegidos.length === 0 && <p className="text-xs text-amber-700 mt-1">Sin los conceptos automáticos, elegí al menos un concepto.</p>}
        </div>
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <div className="flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="button" disabled={!valido || crear.isPending} onClick={() => { setError(null); crear.mutate() }}>{crear.isPending ? 'Creando…' : 'Crear el recibo'}</BotonPrimario>
        </div>
      </div>
    </Modal>
  )
}
