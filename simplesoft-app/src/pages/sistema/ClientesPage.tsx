import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Mail, Phone, Plus, Search, Star, Trash2, Users } from 'lucide-react'
import { getClientes, guardarFicha, type Actividad, type ClienteFicha, type Contacto, type ModuloEmpresa } from '../../api/clientes'
import { mensajeDeError } from '../../api/axios'
import { activos, useCatalogos } from '../../hooks/useCatalogos'
import Modal from '../../components/ui/Modal'
import { BotonPrimario, BotonSecundario, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import SelectorActividades from '../../components/sistema/SelectorActividades'
import { EtiquetaTipo } from '../../components/sistema/TipoEmpresa'
import { FormEmpresa } from './EmpresasPage'

const dia = (s: string | null) => (s ? s.slice(0, 10) : '')
const fecha = (s: string | null) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—')
const principal = <T extends { principal: boolean }>(l: T[]) => l.find((x) => x.principal) ?? l[0]
const habilitados = (c: ClienteFicha) => c.modulos.filter((m) => m.habilitado)

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <div><div className="text-xs text-gray-500">{titulo}</div><div className="text-sm text-gray-800 break-words">{children || <span className="text-gray-400">—</span>}</div></div>
}

/** Edición de la ficha comercial: actividades, contactos y módulos contratados. */
function EditarFicha({ c, onClose }: { c: ClienteFicha; onClose: () => void }) {
  const qc = useQueryClient()
  const [acts, setActs] = useState<Actividad[]>(c.actividades.map(({ idActividad, codigo, descripcion }) => ({ idActividad, codigo, descripcion })))
  const [ppal, setPpal] = useState<number | null>(principal(c.actividades)?.idActividad ?? null)
  const [conts, setConts] = useState<Contacto[]>(c.contactos)
  // los módulos que se pueden contratar salen del catálogo; lo que se cambió en pantalla se guarda aparte hasta tocar "Guardar"
  const cat = useCatalogos()
  const [cambios, setCambios] = useState<Record<string, ModuloEmpresa>>({})
  const mods: ModuloEmpresa[] = activos(cat.modulos).filter((m) => m.contratable)
    .map((m) => cambios[m.codigo] ?? c.modulos.find((x) => x.modulo === m.codigo) ?? { modulo: m.codigo, habilitado: false, desde: null, hasta: null })
  const [error, setError] = useState<string | null>(null)

  const setCont = (i: number, p: Partial<Contacto>) => setConts(conts.map((x, j) => (j === i ? { ...x, ...p } : p.principal ? { ...x, principal: false } : x)))
  const setMod = (codigo: string, p: Partial<ModuloEmpresa>) => setCambios({ ...cambios, [codigo]: { ...mods.find((m) => m.modulo === codigo)!, ...p } })
  const hoy = new Date().toISOString().slice(0, 10)

  const guardar = useMutation({
    mutationFn: () => guardarFicha(c.empresa.idEmpresa, {
      actividades: acts.map((a) => a.idActividad),
      actividadPrincipal: ppal && acts.some((a) => a.idActividad === ppal) ? ppal : (acts[0]?.idActividad ?? null),
      contactos: conts.filter((x) => x.nombre.trim() || x.telefono || x.email),
      // solo se guardan los módulos que alguna vez se contrataron: los demás no tienen fila
      modulos: mods.filter((m) => m.habilitado || m.desde || m.hasta || c.modulos.some((x) => x.modulo === m.modulo)),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sistema', 'clientes'] }); onClose() },
    onError: (e) => setError(mensajeDeError(e)),
  })

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Actividades</h3>
        <SelectorActividades acts={acts} setActs={setActs} ppal={ppal} setPpal={setPpal} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Personas de contacto</h3>
          <button type="button" onClick={() => setConts([...conts, { nombre: '', rol: null, telefono: null, email: null, principal: conts.length === 0 }])} className="text-sm text-blue-700 hover:underline inline-flex items-center gap-1"><Plus size={14} /> Agregar</button>
        </div>
        <div className="space-y-2">
          {conts.map((x, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr_1.4fr_auto] gap-2 items-center">
              <input value={x.nombre} onChange={(e) => setCont(i, { nombre: e.target.value })} placeholder="Nombre" className={inputCls} />
              <input value={x.rol ?? ''} onChange={(e) => setCont(i, { rol: e.target.value || null })} placeholder="Rol" className={inputCls} />
              <input value={x.telefono ?? ''} onChange={(e) => setCont(i, { telefono: e.target.value || null })} placeholder="Teléfono / celular" className={inputCls} />
              <input value={x.email ?? ''} onChange={(e) => setCont(i, { email: e.target.value || null })} placeholder="Email" className={inputCls} />
              <div className="flex items-center gap-1 justify-end">
                <button type="button" title="Contacto principal" onClick={() => setCont(i, { principal: true })} className="p-1.5"><Star size={15} className={x.principal ? 'fill-blue-500 text-blue-500' : 'text-gray-400'} /></button>
                <button type="button" title="Quitar" onClick={() => setConts(conts.filter((_, j) => j !== i))} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          {conts.length === 0 && <p className="text-xs text-gray-400">Sin contactos.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Módulos contratados</h3>
        <div className="space-y-1.5">
          {mods.map((m) => (
            <div key={m.modulo} className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2 w-40 cursor-pointer">
                <input type="checkbox" checked={m.habilitado} onChange={(e) => setMod(m.modulo, { habilitado: e.target.checked, desde: e.target.checked && !m.desde ? hoy : m.desde })} />
                {cat.nombreModulo(m.modulo)}
              </label>
              <label className="text-xs text-gray-500 flex items-center gap-1.5">Desde <input type="date" disabled={!m.habilitado} value={dia(m.desde)} onChange={(e) => setMod(m.modulo, { desde: e.target.value || null })} className={`${inputCls} !w-auto !py-1`} /></label>
              <label className="text-xs text-gray-500 flex items-center gap-1.5">Hasta <input type="date" disabled={!m.habilitado} value={dia(m.hasta)} onChange={(e) => setMod(m.modulo, { hasta: e.target.value || null })} className={`${inputCls} !w-auto !py-1`} /></label>
            </div>
          ))}
        </div>
      </section>

      {error && <Mensaje tipo="error">{error}</Mensaje>}
      <div className="flex justify-end gap-2">
        <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
        <BotonPrimario type="button" onClick={() => { setError(null); guardar.mutate() }} disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar ficha'}</BotonPrimario>
      </div>
    </div>
  )
}

/** Ficha completa de un cliente (los datos que no entran en la fila de la tabla). */
function FichaModal({ c, onClose }: { c: ClienteFicha; onClose: () => void }) {
  const e = c.empresa
  const cat = useCatalogos()
  const [editando, setEditando] = useState(false)
  const [datos, setDatos] = useState(false)
  const domicilio = [e.domicilio, e.localidad, e.provincia, e.codigoPostal && `(${e.codigoPostal})`].filter(Boolean).join(', ')
  return (
    <>
      <Modal titulo={e.razonSocial} onClose={onClose} ancho="max-w-3xl">
        {editando ? <EditarFicha c={c} onClose={() => setEditando(false)} /> : (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-x-4 gap-y-3">
              <Dato titulo="Código">{e.codigo}</Dato>
              <Dato titulo="Nombre de fantasía">{e.nombreFantasia}</Dato>
              <Dato titulo="CUIT">{e.cuit}</Dato>
              <Dato titulo="Condición frente al IVA">{cat.nombreCondicionIva(e.condicionIva)}</Dato>
              <Dato titulo="Tipo de empleador">{cat.nombreTipoEmpleador(e.tipoEmpleador)}</Dato>
              <Dato titulo="Cliente desde">{fecha(c.fechaAlta)}</Dato>
              <div className="sm:col-span-3"><Dato titulo="Domicilio">{domicilio}</Dato></div>
              <Dato titulo="Teléfono / celular">{e.telefono}</Dato>
              <Dato titulo="Email">{e.email}</Dato>
              <Dato titulo="Estado">{e.activo ? 'Activa' : 'De baja'}</Dato>
            </div>

            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-1.5">Actividades</h3>
              {c.actividades.length === 0 ? <p className="text-sm text-gray-400">Sin actividades cargadas.</p> : (
                <ul className="text-sm space-y-0.5">
                  {c.actividades.map((a) => <li key={a.idActividad}>{a.principal && <Star size={12} className="inline mr-1 fill-blue-500 text-blue-500" />}{a.codigo && <span className="font-mono text-xs text-gray-500 mr-1.5">{a.codigo}</span>}{a.descripcion}</li>)}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-1.5">Contactos</h3>
              {c.contactos.length === 0 ? <p className="text-sm text-gray-400">Sin contactos cargados.</p> : (
                <ul className="text-sm space-y-1">
                  {c.contactos.map((x, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-x-3">
                      <span className="font-medium">{x.nombre}</span>{x.principal && <Star size={12} className="fill-blue-500 text-blue-500" />}
                      {x.rol && <span className="text-xs text-gray-500">{x.rol}</span>}
                      {x.telefono && <span className="inline-flex items-center gap-1 text-gray-600"><Phone size={12} />{x.telefono}</span>}
                      {x.email && <a href={`mailto:${x.email}`} className="inline-flex items-center gap-1 text-blue-700 hover:underline"><Mail size={12} />{x.email}</a>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="grid sm:grid-cols-2 gap-5">
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-1.5">Módulos</h3>
                {c.modulos.length === 0 ? <p className="text-sm text-gray-400">Ninguno contratado.</p> : (
                  <table className="w-full text-sm"><tbody>
                    {c.modulos.map((m) => (
                      <tr key={m.modulo} className={m.habilitado ? '' : 'text-gray-400'}>
                        <td className="py-0.5">{cat.nombreModulo(m.modulo)}</td>
                        <td className="py-0.5 text-xs">{m.habilitado ? 'Habilitado' : 'No habilitado'}</td>
                        <td className="py-0.5 text-xs text-right">{m.desde ? `desde ${fecha(m.desde)}` : ''}{m.hasta ? ` hasta ${fecha(m.hasta)}` : ''}</td>
                      </tr>
                    ))}
                  </tbody></table>
                )}
              </section>
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-1.5">Empleados activos: {c.empleadosActivos}</h3>
                {c.porConvenio.length === 0 ? <p className="text-sm text-gray-400">Sin empleados.</p> : (
                  <table className="w-full text-sm"><tbody>
                    {c.porConvenio.map((x) => <tr key={x.convenio}><td className="py-0.5">{x.convenio}</td><td className="py-0.5 text-right tabular-nums">{x.cantidad}</td></tr>)}
                  </tbody></table>
                )}
              </section>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <BotonSecundario onClick={() => setDatos(true)}>Editar datos de la empresa</BotonSecundario>
              <BotonPrimario onClick={() => setEditando(true)}>Editar ficha</BotonPrimario>
            </div>
          </div>
        )}
      </Modal>
      {datos && <FormEmpresa editando={e} onClose={() => setDatos(false)} />}
    </>
  )
}

/** Clientes: todas las empresas del sistema con sus datos comerciales. Solo el superadministrador. */
export default function ClientesPage() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sistema', 'clientes'], queryFn: getClientes })
  const cat = useCatalogos()
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<'activas' | 'bajas' | 'todas'>('activas')
  const [modulo, setModulo] = useState('')
  // por defecto los tipos a los que entran los clientes (producción y prueba); la plantilla MASTER y la DEMO se ven aparte
  const [tipo, setTipo] = useState('clientes')
  const [verId, setVerId] = useState<number | null>(null)

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (data ?? []).filter((c) => {
      // "clientes" son los tipos a los que entran los usuarios de las empresas (producción y prueba); si no, un tipo puntual o todos
      if (tipo === 'clientes' && !(cat.tipoEmpresa(c.empresa.tipo)?.accesoClientes ?? true)) return false
      if (tipo !== 'clientes' && tipo !== 'todas' && c.empresa.tipo !== tipo) return false
      if (estado === 'activas' && !c.empresa.activo) return false
      if (estado === 'bajas' && c.empresa.activo) return false
      if (modulo && !habilitados(c).some((m) => m.modulo === modulo)) return false
      if (!t) return true
      const e = c.empresa
      return [e.razonSocial, e.nombreFantasia, e.codigo, e.cuit, e.localidad, ...c.actividades.map((a) => a.descripcion), ...c.contactos.map((x) => x.nombre)].some((s) => s?.toLowerCase().includes(t))
    })
  }, [data, q, estado, modulo, tipo, cat])
  const pag = usePaginado(filtradas)
  const ficha = data?.find((c) => c.empresa.idEmpresa === verId)

  // las estadísticas cuentan solo clientes en producción (no las bases de prueba, la plantilla ni la demo)
  const activas = (data ?? []).filter((c) => c.empresa.activo && (cat.tipoEmpresa(c.empresa.tipo)?.cuentaComoCliente ?? false))
  const modulosContratables = activos(cat.modulos).filter((m) => m.contratable)
  const totalEmpleados = activas.reduce((s, c) => s + c.empleadosActivos, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
      <p className="text-gray-500 mb-4">Las empresas que usan el sistema: actividad, contacto, módulos contratados y cantidad de empleados.</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2"><div className="text-xs text-gray-500">Clientes activos</div><div className="text-xl font-semibold text-gray-800">{activas.length}</div></div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2"><div className="text-xs text-gray-500">Empleados activos</div><div className="text-xl font-semibold text-gray-800">{totalEmpleados}</div></div>
        {modulosContratables.filter((m) => activas.some((c) => habilitados(c).some((x) => x.modulo === m.codigo))).map((m) => (
          <div key={m.codigo} className="bg-white border border-gray-200 rounded-xl px-4 py-2"><div className="text-xs text-gray-500">{m.descripcion}</div><div className="text-xl font-semibold text-gray-800">{activas.filter((c) => habilitados(c).some((x) => x.modulo === m.codigo)).length}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-3 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, CUIT, actividad, contacto…" className={`${inputCls} pl-8`} />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${inputCls} !w-auto`} aria-label="Tipo de empresa">
          <option value="clientes">Clientes (producción y prueba)</option>
          {activos(cat.tiposEmpresa).map((t) => <option key={t.codigo} value={t.codigo}>{t.descripcion}</option>)}
          <option value="todas">Todos los tipos</option>
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} className={`${inputCls} !w-auto`}>
          <option value="activas">Activas</option><option value="bajas">De baja</option><option value="todas">Todas</option>
        </select>
        <select value={modulo} onChange={(e) => setModulo(e.target.value)} className={`${inputCls} !w-auto`}>
          <option value="">Todos los módulos</option>{modulosContratables.map((m) => <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}

      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2 font-medium">Cliente</th><th className="px-4 py-2 font-medium">Actividad</th><th className="px-4 py-2 font-medium">Contacto</th>
                <th className="px-4 py-2 font-medium">Módulos</th><th className="px-4 py-2 font-medium text-right">Empleados</th><th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {pag.filas.map((c) => {
                const e = c.empresa
                const act = principal(c.actividades)
                const cont = principal(c.contactos)
                return (
                  <tr key={e.idEmpresa} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${e.activo ? '' : 'text-gray-400'}`}>
                    <td className="px-4 py-2">
                      <div className="font-medium">{e.razonSocial}<EtiquetaTipo tipo={e.tipo} />{!e.activo && <span className="ml-2 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">De baja</span>}</div>
                      <div className="text-xs text-gray-500">{[e.nombreFantasia, e.cuit, e.codigo].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="px-4 py-2">{act ? <>{act.descripcion}{c.actividades.length > 1 && <span className="ml-1 text-xs text-gray-400">+{c.actividades.length - 1}</span>}</> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-2">
                      {cont ? <><div>{cont.nombre}</div><div className="text-xs text-gray-500">{cont.telefono ?? cont.email ?? ''}</div></> : <div className="text-xs text-gray-500">{e.telefono ?? e.email ?? '—'}</div>}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {habilitados(c).map((m) => <span key={m.modulo} className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{m.modulo}</span>)}
                        {habilitados(c).length === 0 && <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums"><span className="inline-flex items-center gap-1"><Users size={12} className="text-gray-400" />{c.empleadosActivos}</span></td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <button title="Ver ficha" onClick={() => setVerId(e.idEmpresa)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Eye size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtradas.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No hay clientes con ese filtro.</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
      {ficha && <FichaModal c={ficha} onClose={() => setVerId(null)} />}
    </div>
  )
}
