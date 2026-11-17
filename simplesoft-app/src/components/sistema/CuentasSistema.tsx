import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil } from 'lucide-react'
import { getCuentas, getRolesSistema, modificarCuenta, reiniciarClaveCuenta } from '../../api/sistema'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import Modal from '../ui/Modal'
import ClaveTemporalModal from '../ui/ClaveTemporalModal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../ui/Campos'
import { Paginador, usePaginado } from '../ui/Paginador'
import { ThOrden, useOrden, type Accesor } from '../ui/Orden'
import { preguntar } from '../ui/Confirmar'
import { CeldaContacto, CeldaCreadas, CeldaEmpresas, EstadoUsuario } from './CeldasUsuario'
import type { ClaveTemporal, CuentaUsuario } from '../../types/sistema'

const ACCESORES: Record<string, Accesor<CuentaUsuario>> = {
  usuario: (u) => u.usuario,
  nombre: (u) => u.nombre,
  creadas: (u) => u.basesCreadas,
  rolSistema: (u) => u.rolSistemaDescripcion,
  estado: (u) => (!u.activo ? 2 : u.debeCambiarClave ? 1 : 0),
  ingreso: (u) => (u.ultimoAcceso ? new Date(u.ultimoAcceso).getTime() : null),
}

/** Edita los datos de una cuenta de cualquier usuario: contacto, rol de sistema y límite de empresas que puede crear. */
function FormCuenta({ cuenta, onClose }: { cuenta: CuentaUsuario; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: rolesSistema = [] } = useQuery({ queryKey: ['sistema', 'roles-sistema'], queryFn: getRolesSistema })
  const [f, setF] = useState({ nombre: cuenta.nombre, email: cuenta.email ?? '', celular: cuenta.celular ?? '', rolSistema: cuenta.rolSistema, maxBases: cuenta.maxBases != null ? String(cuenta.maxBases) : '' })
  const [error, setError] = useState<string | null>(null)
  const guardar = useMutation({
    mutationFn: () => modificarCuenta(cuenta.idUsuario, { nombre: f.nombre, email: f.email.trim() || null, celular: f.celular.trim(), rolSistema: f.rolSistema, maxBases: f.maxBases.trim() === '' ? -1 : Number(f.maxBases) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sistema', 'cuentas'] }); qc.invalidateQueries({ queryKey: ['sistema', 'usuarios'] }); onClose() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <Modal titulo={`Editar ${cuenta.usuario}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="space-y-4">
        <Campo label="Nombre y apellido"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={inputCls} /></Campo>
        <div className="grid sm:grid-cols-2 gap-4">
          <Campo label="Email de contacto (opcional)"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} /></Campo>
          <Campo label="Celular de contacto (opcional)"><input type="tel" value={f.celular} onChange={(e) => setF({ ...f, celular: e.target.value })} maxLength={25} className={inputCls} /></Campo>
        </div>
        <Campo label="Rol en el sistema">
          <select value={f.rolSistema} onChange={(e) => setF({ ...f, rolSistema: e.target.value })} className={inputCls}>
            {rolesSistema.map((r) => <option key={r.codigo} value={r.codigo}>{r.descripcion}{r.detalle ? ` — ${r.detalle}` : ''}</option>)}
          </select>
        </Campo>
        <Campo label="Límite de empresas que puede crear">
          <input type="number" min={0} value={f.maxBases} onChange={(e) => setF({ ...f, maxBases: e.target.value })} placeholder="El del rol de sistema" className={inputCls} />
          <p className="text-xs text-gray-500 mt-1">Vacío = usa el límite de su rol de sistema. El superadministrador no tiene límite. El rol que tiene dentro de cada empresa se cambia desde esa empresa.</p>
        </Campo>
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <div className="flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={guardar.isPending || !f.nombre.trim()}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Todos los usuarios del sistema, sin importar la empresa en la que se trabaje (solo el superadministrador). */
export default function CuentasSistema() {
  const qc = useQueryClient()
  const empresaActual = useAuthStore((s) => s.empresaActual)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sistema', 'cuentas'], queryFn: getCuentas })
  const orden = useOrden(data, ACCESORES, { col: 'nombre', dir: 'asc' }, 'usuario')
  const pag = usePaginado(orden.lista)
  const [editando, setEditando] = useState<CuentaUsuario | null>(null)
  const [clave, setClave] = useState<ClaveTemporal | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const reiniciar = useMutation({
    mutationFn: (u: CuentaUsuario) => reiniciarClaveCuenta(u.idUsuario),
    onSuccess: (c) => { setClave(c); qc.invalidateQueries({ queryKey: ['sistema', 'cuentas'] }) },
    onError: (e) => setAviso(mensajeDeError(e)),
  })

  return (
    <div>
      {aviso && <div className="mb-4"><Mensaje tipo="error">{aviso}</Mensaje></div>}
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <ThOrden col="usuario" titulo="Usuario" orden={orden} onOrdenar={() => pag.setPagina(1)} />
                <ThOrden col="nombre" titulo="Nombre y contacto" orden={orden} onOrdenar={() => pag.setPagina(1)} />
                <th className="px-4 py-2 font-medium">Empresas</th>
                <ThOrden col="creadas" titulo="Creadas" orden={orden} onOrdenar={() => pag.setPagina(1)} />
                <ThOrden col="rolSistema" titulo="Rol en el sistema" orden={orden} onOrdenar={() => pag.setPagina(1)} />
                <ThOrden col="estado" titulo="Estado" orden={orden} onOrdenar={() => pag.setPagina(1)} />
                <ThOrden col="ingreso" titulo="Último ingreso" orden={orden} onOrdenar={() => pag.setPagina(1)} />
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {pag.filas.map((u) => (
                <tr key={u.idUsuario} className={`border-b border-gray-50 last:border-0 ${u.activo ? '' : 'text-gray-400'}`}>
                  <td className="px-4 py-2 font-mono text-xs">{u.usuario}{u.esSuperadmin && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Super</span>}</td>
                  <td className="px-4 py-2"><CeldaContacto nombre={u.nombre} email={u.email} celular={u.celular} /></td>
                  <td className="px-4 py-2 max-w-[20rem]"><CeldaEmpresas empresas={u.empresas} actualId={empresaActual?.idEmpresa} /></td>
                  <td className="px-4 py-2 text-xs tabular-nums whitespace-nowrap"><CeldaCreadas creadas={u.basesCreadas} limite={u.limiteBases} /></td>
                  <td className="px-4 py-2 text-xs">{u.rolSistemaDescripcion}</td>
                  <td className="px-4 py-2 text-xs"><EstadoUsuario activo={u.activo} bloqueadoHasta={u.bloqueadoHasta} debeCambiarClave={u.debeCambiarClave} /></td>
                  <td className="px-4 py-2 text-xs text-gray-500">{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-AR') : 'Nunca'}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <button title="Editar" onClick={() => setEditando(u)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={15} /></button>
                      <button title="Reiniciar clave" onClick={() => { preguntar(`¿Reiniciar la clave de ${u.usuario}? Se genera una temporal y la actual deja de servir.`, () => reiniciar.mutate(u), { titulo: 'Reiniciar clave', boton: 'Reiniciar', peligro: true }) }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><KeyRound size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No hay usuarios</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">{data.length} usuarios en el sistema</div>
        </div>
      )}
      {editando && <FormCuenta cuenta={editando} onClose={() => setEditando(null)} />}
      {clave && <ClaveTemporalModal datos={clave} onClose={() => setClave(null)} />}
    </div>
  )
}
