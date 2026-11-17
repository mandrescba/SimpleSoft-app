import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { crearGrupo, eliminarGrupo, getGrupos, modificarGrupo } from '../../api/grupos'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import Modal from '../../components/ui/Modal'
import ConceptosDeGrupo from '../../components/sueldos/ConceptosDeGrupo'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { preguntar } from '../../components/ui/Confirmar'

function NuevoGrupo({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const crear = useMutation({
    mutationFn: () => crearGrupo(codigo, descripcion),
    onSuccess: (g) => { qc.invalidateQueries({ queryKey: ['sueldos', 'grupos'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'catalogos'] }); navigate(`/sueldos/grupos/${g.idGrupoConceptos}`) },
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <Modal titulo="Nuevo grupo de conceptos" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); crear.mutate() }} className="grid gap-4">
        <Campo label="Grupo (código)"><input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={20} placeholder="CONCEPTOS" className={inputCls} /></Campo>
        <Campo label="Descripción"><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Grupo de conceptos base" className={inputCls} /></Campo>
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <div className="flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={crear.isPending || !codigo.trim() || !descripcion.trim()}>{crear.isPending ? 'Creando…' : 'Crear'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Grupos de conceptos de la empresa. */
export function GruposPage() {
  const puedeCrear = tienePermiso(permisosDelToken(useAuthStore((s) => s.token)), 'SLD', 'crear')
  const [nuevo, setNuevo] = useState(false)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'grupos'], queryFn: getGrupos })
  const pag = usePaginado(data)
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Grupos de conceptos</h1>
          <p className="text-gray-500">Qué conceptos se liquidan juntos: el del convenio, el de Ganancias, uno propio de un empleado.</p>
        </div>
        {puedeCrear && <BotonPrimario onClick={() => setNuevo(true)} className="inline-flex items-center gap-1.5 shrink-0"><Plus size={16} /> Nuevo grupo</BotonPrimario>}
      </div>
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Grupo</th><th className="px-4 py-2 font-medium">Descripción</th><th className="px-4 py-2 font-medium text-right">Conceptos</th><th className="px-4 py-2 font-medium text-right">En uso por</th>
            </tr></thead>
            <tbody>
              {pag.filas.map((g) => (
                <tr key={g.idGrupoConceptos} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs"><Link to={`/sueldos/grupos/${g.idGrupoConceptos}`} className="text-blue-700 hover:underline">{g.codigo}</Link></td>
                  <td className="px-4 py-2">{g.descripcion}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{g.conceptos}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-500">{g.enUso}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Todavía no hay grupos</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
      {nuevo && <NuevoGrupo onClose={() => setNuevo(false)} />}
    </div>
  )
}

/** Un grupo: su descripción y los conceptos que contiene. */
export function GrupoPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const { data: grupos, isLoading } = useQuery({ queryKey: ['sueldos', 'grupos'], queryFn: getGrupos })
  const g = grupos?.find((x) => x.idGrupoConceptos === id)
  const [descripcion, setDescripcion] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  useEffect(() => { if (g) setDescripcion(g.descripcion) }, [g])
  const puedeModificar = tienePermiso(permisos, 'SLD', 'modificar')

  const guardar = useMutation({
    mutationFn: () => modificarGrupo(id, descripcion),
    onSuccess: () => { setMsg({ tipo: 'ok', texto: 'Grupo guardado.' }); qc.invalidateQueries({ queryKey: ['sueldos', 'grupos'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'catalogos'] }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const borrar = useMutation({
    mutationFn: () => eliminarGrupo(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'grupos'] }); navigate('/sueldos/grupos', { replace: true }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  if (isLoading) return <p className="text-sm text-gray-500">Cargando…</p>
  if (!g) return <Mensaje tipo="error">No se encontró el grupo.</Mensaje>
  return (
    <div>
      <Link to="/sueldos/grupos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 mb-2"><ArrowLeft size={14} /> Grupos de conceptos</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{g.codigo} <span className="text-gray-400 font-normal">— {g.descripcion}</span></h1>
      <form onSubmit={(e) => { e.preventDefault(); setMsg(null); guardar.mutate() }} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-3 mb-4">
        <Campo label="Descripción" className="flex-1 min-w-60"><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} disabled={!puedeModificar} className={inputCls} /></Campo>
        {puedeModificar && <BotonPrimario type="submit" disabled={guardar.isPending || !descripcion.trim()}>Guardar</BotonPrimario>}
        {tienePermiso(permisos, 'SLD', 'eliminar') && (
          <BotonSecundario type="button" disabled={borrar.isPending} onClick={() => { setMsg(null); preguntar(`¿Borrar el grupo ${g.codigo} con sus ${g.conceptos} conceptos?`, () => borrar.mutate(), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} className="inline-flex items-center gap-1.5 text-red-600"><Trash2 size={14} /> Borrar</BotonSecundario>
        )}
      </form>
      {msg && <div className="mb-4"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      <ConceptosDeGrupo idGrupo={id} puede={puedeModificar} />
    </div>
  )
}
