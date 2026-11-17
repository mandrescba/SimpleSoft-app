import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { bajaUsuario, crearUsuario, getRoles, getRolesSistema, getUsuarios, modificarUsuario, reiniciarClave } from '../../api/sistema'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import Modal from '../../components/ui/Modal'
import ClaveTemporalModal from '../../components/ui/ClaveTemporalModal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import type { ClaveTemporal, UsuarioDeEmpresa } from '../../types/sistema'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { preguntar } from '../../components/ui/Confirmar'
import { CeldaContacto, CeldaCreadas, CeldaEmpresas, EstadoUsuario } from '../../components/sistema/CeldasUsuario'
import CuentasSistema from '../../components/sistema/CuentasSistema'

interface Form { usuario: string; nombre: string; email: string; celular: string; idRol: number; rolSistema: string; maxBases: string }

function FormUsuario({ editando, onClose, onClave }: { editando: UsuarioDeEmpresa | null; onClose: () => void; onClave: (c: ClaveTemporal) => void }) {
  const qc = useQueryClient()
  const { esSuperadmin } = useAuthStore()
  const { data: roles = [] } = useQuery({ queryKey: ['sistema', 'roles'], queryFn: getRoles })
  const { data: rolesSistema = [] } = useQuery({ queryKey: ['sistema', 'roles-sistema'], queryFn: getRolesSistema })
  // rol de sistema: al crear lo elige quien da el alta (vacío = el que corresponde al rol de la empresa); al editar solo lo cambia el superadministrador
  const [f, setF] = useState<Form>({ usuario: editando?.usuario ?? '', nombre: editando?.nombre ?? '', email: editando?.email ?? '', celular: editando?.celular ?? '', idRol: editando?.idRol ?? 0,
    rolSistema: editando?.rolSistema ?? '', maxBases: editando?.maxBases != null ? String(editando.maxBases) : '' })
  const [error, setError] = useState<string | null>(null)

  const guardar = useMutation({
    mutationFn: async () => {
      const idRol = f.idRol || roles.find((r) => r.nombre === 'Consulta')?.idRol || roles[0]?.idRol
      const email = f.email.trim() || null
      if (editando) {
        await modificarUsuario(editando.idUsuario, { nombre: f.nombre, email, idRol, celular: f.celular.trim(),
          ...(esSuperadmin ? { rolSistema: f.rolSistema || editando.rolSistema, maxBases: f.maxBases.trim() === '' ? -1 : Number(f.maxBases) } : {}) })
        return null
      }
      return crearUsuario({ usuario: f.usuario, nombre: f.nombre, email, idRol, celular: f.celular.trim() || null, ...(f.rolSistema ? { rolSistema: f.rolSistema } : {}) })
    },
    onSuccess: (clave) => { qc.invalidateQueries({ queryKey: ['sistema', 'usuarios'] }); onClose(); if (clave) onClave(clave) },
    onError: (e) => setError(mensajeDeError(e)),
  })

  return (
    <Modal titulo={editando ? `Editar ${editando.usuario}` : 'Nuevo usuario'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="space-y-4">
        <Campo label="Usuario"><input value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} disabled={!!editando} autoComplete="off" className={inputCls} /></Campo>
        <Campo label="Nombre y apellido"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={inputCls} /></Campo>
        <div className="grid sm:grid-cols-2 gap-4">
          <Campo label="Email de contacto (opcional)"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} /></Campo>
          <Campo label="Celular de contacto (opcional)"><input type="tel" value={f.celular} onChange={(e) => setF({ ...f, celular: e.target.value })} placeholder="+54 9 351 555-0101" maxLength={25} className={inputCls} /></Campo>
        </div>
        <Campo label="Rol en esta empresa">
          <select value={f.idRol || (roles.find((r) => r.nombre === 'Consulta')?.idRol ?? '')} onChange={(e) => setF({ ...f, idRol: Number(e.target.value) })} className={inputCls}>
            {roles.map((r) => <option key={r.idRol} value={r.idRol}>{r.nombre}{r.descripcion ? ` — ${r.descripcion}` : ''}</option>)}
          </select>
        </Campo>
        {(!editando || esSuperadmin) && (
          <Campo label="Rol en el sistema">
            <select value={f.rolSistema} onChange={(e) => setF({ ...f, rolSistema: e.target.value })} className={inputCls}>
              {!editando && <option value="">Según su rol en la empresa</option>}
              {rolesSistema.map((r) => <option key={r.codigo} value={r.codigo}>{r.descripcion}{r.detalle ? ` — ${r.detalle}` : ''}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">Define qué puede hacer en general (por ejemplo, crear sus propias empresas). Lo que puede hacer dentro de cada empresa lo define el rol de arriba.</p>
          </Campo>
        )}
        {editando && esSuperadmin && (
          <Campo label="Límite de empresas que puede crear">
            <input type="number" min={0} value={f.maxBases} onChange={(e) => setF({ ...f, maxBases: e.target.value })} placeholder="El del rol de sistema" className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">Vacío = usa el límite de su rol de sistema. El superadministrador no tiene límite.</p>
          </Campo>
        )}
        {!editando && <p className="text-xs text-gray-500">Se genera una clave temporal que el usuario tendrá que cambiar al ingresar.</p>}
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <div className="flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={guardar.isPending || !f.nombre.trim() || (!editando && !f.usuario.trim())}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Usuarios con acceso a la empresa actual: alta, cambio de rol, reinicio de clave y baja. */
export default function UsuariosPage() {
  const qc = useQueryClient()
  const { token, empresaActual, esSuperadmin } = useAuthStore()
  // el superadministrador ve por defecto a todos los usuarios del sistema; puede pasar a ver solo los de la empresa en la que trabaja
  const [vista, setVista] = useState<'todos' | 'empresa'>('todos')
  const todos = esSuperadmin && vista === 'todos'
  const permisos = permisosDelToken(token)
  const puede = (a: string) => tienePermiso(permisos, 'SYS', a)

  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sistema', 'usuarios'], queryFn: getUsuarios, enabled: !todos })
  const pag = usePaginado(data)
  const [modal, setModal] = useState<{ editando: UsuarioDeEmpresa | null } | null>(null)
  const [clave, setClave] = useState<ClaveTemporal | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const reiniciar = useMutation({
    mutationFn: (u: UsuarioDeEmpresa) => reiniciarClave(u.idUsuario),
    onSuccess: (c) => { setClave(c); qc.invalidateQueries({ queryKey: ['sistema', 'usuarios'] }) },
    onError: (e) => setAviso({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const baja = useMutation({
    mutationFn: (u: UsuarioDeEmpresa) => bajaUsuario(u.idUsuario),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sistema', 'usuarios'] }); setAviso({ tipo: 'ok', texto: 'Usuario dado de baja en esta empresa.' }) },
    onError: (e) => setAviso({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
          <p className="text-gray-500">{todos ? 'Todos los usuarios del sistema, con las empresas en las que trabajan.' : <>Quiénes pueden trabajar con <strong>{empresaActual?.razonSocial}</strong> y con qué rol.</>}</p>
        </div>
        {puede('crear') && !todos && <BotonPrimario onClick={() => setModal({ editando: null })} className="inline-flex items-center gap-1.5 shrink-0"><Plus size={16} /> Nuevo usuario</BotonPrimario>}
      </div>

      {esSuperadmin && (
        <div role="tablist" className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 mb-4 text-sm">
          {([['todos', 'Todos los usuarios del sistema'], ['empresa', `Solo de ${empresaActual?.codigo ?? 'esta empresa'}`]] as const).map(([clave, titulo]) => (
            <button key={clave} type="button" role="tab" aria-selected={vista === clave} onClick={() => setVista(clave)}
              className={`px-3 py-1.5 rounded-md transition-colors ${vista === clave ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{titulo}</button>
          ))}
        </div>
      )}

      {todos && <CuentasSistema />}

      {aviso && !todos && <div className="mb-4"><Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje></div>}
      {isLoading && !todos && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && !todos && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}

      {data && !todos && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2 font-medium">Usuario</th><th className="px-4 py-2 font-medium">Nombre y contacto</th><th className="px-4 py-2 font-medium">Empresas</th>
                <th className="px-4 py-2 font-medium">Creadas</th><th className="px-4 py-2 font-medium">Roles</th>
                <th className="px-4 py-2 font-medium">Estado</th><th className="px-4 py-2 font-medium">Último ingreso</th><th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {pag.filas.map((u) => (
                <tr key={u.idUsuario} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{u.usuario}{u.esSuperadmin && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Super</span>}</td>
                  <td className="px-4 py-2"><CeldaContacto nombre={u.nombre} email={u.email} celular={u.celular} /></td>
                  <td className="px-4 py-2 max-w-[18rem]"><CeldaEmpresas empresas={u.empresas} actualId={empresaActual?.idEmpresa} /></td>
                  <td className="px-4 py-2 text-xs tabular-nums whitespace-nowrap"><CeldaCreadas creadas={u.basesCreadas} limite={u.limiteBases} /></td>
                  <td className="px-4 py-2 text-xs">{u.rol}<div className="text-gray-400">{u.rolSistemaDescripcion}</div></td>
                  <td className="px-4 py-2 text-xs"><EstadoUsuario activo={u.activo} bloqueadoHasta={u.bloqueadoHasta} debeCambiarClave={u.debeCambiarClave} /></td>
                  <td className="px-4 py-2 text-xs text-gray-500">{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-AR') : 'Nunca'}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      {puede('modificar') && <button title="Editar" onClick={() => setModal({ editando: u })} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={15} /></button>}
                      {puede('modificar') && <button title="Reiniciar clave" onClick={() => { preguntar(`¿Reiniciar la clave de ${u.usuario}? Se genera una temporal y la actual deja de servir.`, () => reiniciar.mutate(u), { titulo: 'Reiniciar clave', boton: 'Reiniciar', peligro: true })}} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><KeyRound size={15} /></button>}
                      {puede('eliminar') && <button title="Dar de baja" onClick={() => { preguntar(`¿Dar de baja a ${u.usuario} en esta empresa? Pierde el acceso; lo que cargó se conserva.`, () => baja.mutate(u), { titulo: 'Dar de baja', boton: 'Dar de baja', peligro: true })}} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}

      {modal && <FormUsuario editando={modal.editando} onClose={() => setModal(null)} onClave={setClave} />}
      {clave && <ClaveTemporalModal datos={clave} onClose={() => setClave(null)} />}
    </div>
  )
}
