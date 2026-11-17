import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { crearConvenio, getConvenios, type ConvenioForm } from '../../api/convenios'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import Modal from '../../components/ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { activos, useCatalogos } from '../../hooks/useCatalogos'

function NuevoConvenio({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const cat = useCatalogos()
  const qc = useQueryClient()
  const [f, setF] = useState<Pick<ConvenioForm, 'codigo' | 'descripcion' | 'liquidacion'>>({ codigo: '', descripcion: '', liquidacion: 'MENSUAL' })
  const [error, setError] = useState<string | null>(null)
  const crear = useMutation({
    mutationFn: () => crearConvenio({ ...f, diasMes: null, horasMes: null, horasDia: null, diasVacaciones: null, moneda: 'ARS', idObraSocial: null, idGrupoConceptos: null, orden: 0, activo: true }),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['sueldos', 'convenios'] }); navigate(`/sueldos/convenios/${c.idConvenio}`) },
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <Modal titulo="Nuevo convenio" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); crear.mutate() }} className="grid sm:grid-cols-2 gap-4">
        <Campo label="Convenio (código)"><input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase() })} placeholder="COMERCIO" maxLength={20} className={inputCls} /></Campo>
        <Campo label="Modalidad de liquidación">
          <select value={f.liquidacion} onChange={(e) => setF({ ...f, liquidacion: e.target.value })} className={inputCls}>
            {activos(cat.modalidadesLiquidacion).map((m) => <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>)}
          </select>
        </Campo>
        <Campo label="Descripción" className="sm:col-span-2"><input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} className={inputCls} /></Campo>
        <p className="sm:col-span-2 text-xs text-gray-500">Después cargás las categorías con su sueldo y los conceptos que aplica el convenio.</p>
        {error && <div className="sm:col-span-2"><Mensaje tipo="error">{error}</Mensaje></div>}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={crear.isPending || !f.codigo.trim() || !f.descripcion.trim()}>{crear.isPending ? 'Creando…' : 'Crear'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Convenios de la empresa. */
export default function ConveniosPage() {
  const cat = useCatalogos()
  const puedeCrear = tienePermiso(permisosDelToken(useAuthStore((s) => s.token)), 'SLD', 'crear')
  const [bajas, setBajas] = useState(false)
  const [nuevo, setNuevo] = useState(false)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'convenios', bajas], queryFn: () => getConvenios(bajas) })
  const pag = usePaginado(data)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Convenios</h1>
          <p className="text-gray-500">Cada convenio tiene sus categorías (con el sueldo por período) y los conceptos que aplica.</p>
        </div>
        {puedeCrear && <BotonPrimario onClick={() => setNuevo(true)} className="inline-flex items-center gap-1.5 shrink-0"><Plus size={16} /> Nuevo convenio</BotonPrimario>}
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-gray-600 mb-3"><input type="checkbox" checked={bajas} onChange={(e) => setBajas(e.target.checked)} /> Mostrar los dados de baja</label>
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Convenio</th><th className="px-4 py-2 font-medium">Descripción</th><th className="px-4 py-2 font-medium">Liquidación</th>
              <th className="px-4 py-2 font-medium">Obra social</th><th className="px-4 py-2 font-medium text-right">Categorías</th>
            </tr></thead>
            <tbody>
              {pag.filas.map((c) => (
                <tr key={c.idConvenio} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${!c.activo ? 'text-gray-400' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs"><Link to={`/sueldos/convenios/${c.idConvenio}`} className="text-blue-700 hover:underline">{c.codigo}</Link></td>
                  <td className="px-4 py-2">{c.descripcion}{!c.activo && <span className="ml-2 text-xs">(de baja)</span>}</td>
                  <td className="px-4 py-2">{cat.nombreModalidad(c.liquidacion)}</td>
                  <td className="px-4 py-2">{c.obraSocial ?? ''}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.categorias}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Todavía no hay convenios</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
      {nuevo && <NuevoConvenio onClose={() => setNuevo(false)} />}
    </div>
  )
}
