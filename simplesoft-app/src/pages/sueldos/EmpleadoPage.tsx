import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import {
  agregarFamiliar, bajaEmpleado, crearEmpleado, eliminarFamiliar, eliminarNovedad, getCatalogos, getEmpleado, getFamiliares, getNovedades,
  guardarNovedad, modificarEmpleado, modificarFamiliar, reactivarEmpleado,
} from '../../api/empleados'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import type { EmpleadoDetalle, Familiar } from '../../types/sueldos'
import ConceptosEmpleado from '../../components/sueldos/ConceptosEmpleado'
import ArcaEmpleado from '../../components/sueldos/ArcaEmpleado'
import { activos, useCatalogos } from '../../hooks/useCatalogos'
import { preguntar } from '../../components/ui/Confirmar'

type Pestania = 'datos' | 'arca' | 'conceptos' | 'familiares' | 'novedades'

const nuevo: EmpleadoDetalle = {
  idEmpleado: 0, legajo: '', apellido: '', nombre: '', cuil: null, grupo: null, estado: null, tarea: null, fechaIngreso: null, fechaEgreso: null,
  fechaAntiguedad: null, antiguedadFija: null, sexo: null, fechaNacimiento: null, nacionalidad: null, estadoCivil: null, tipoDocumento: 'DNI', numeroDocumento: null,
  domicilio: null, localidad: null, provincia: null, codigoPostal: null, telefono: null, email: null, idCategoria: null, sueldoPactado: null,
  adicional: null, auxiliar: null, dias: null, horas: null, porcentaje: null, jornada: null, proporcional: false, liquidacion: 'MENSUAL',
  diasVacaciones: null, idGrupoConceptos: null, idSucursal: null, centroCosto: null, lugarTrabajo: null, banco: null, cuenta: null, cbu: null, observaciones: null, activo: true,
}

/** Las fechas ISO vienen con hora (2026-01-01T00:00:00): el input date solo quiere la parte de la fecha. */
const dia = (s: string | null) => (s ? s.slice(0, 10) : '')

// ---------------------------------------------------------------- datos

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <legend className="px-2 text-sm font-semibold text-gray-700">{titulo}</legend>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </fieldset>
  )
}

function Datos({ id, puedeModificar }: { id: number; puedeModificar: boolean }) {
  const modalidades = useCatalogos()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const esNuevo = id === 0
  const { data: ficha } = useQuery({ queryKey: ['sueldos', 'empleado', id], queryFn: () => getEmpleado(id), enabled: !esNuevo })
  const { data: cat } = useQuery({ queryKey: ['sueldos', 'catalogos'], queryFn: getCatalogos })
  const [f, setF] = useState<EmpleadoDetalle>(nuevo)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  useEffect(() => { if (ficha) setF(ficha) }, [ficha])

  const texto = (k: keyof EmpleadoDetalle) => (f[k] as string | null) ?? ''
  const setTexto = (k: keyof EmpleadoDetalle, v: string) => setF({ ...f, [k]: v === '' ? null : v })
  const setNum = (k: keyof EmpleadoDetalle, v: string) => setF({ ...f, [k]: v === '' ? null : Number(v) })
  const num = (k: keyof EmpleadoDetalle) => (f[k] as number | null) ?? ''
  const dis = !puedeModificar && !esNuevo

  const guardar = useMutation({
    mutationFn: () => (esNuevo ? crearEmpleado(f) : modificarEmpleado(id, f)),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['sueldos', 'empleados'] })
      qc.invalidateQueries({ queryKey: ['sueldos', 'empleado', id] })
      if (esNuevo && r) navigate(`/sueldos/empleados/${(r as EmpleadoDetalle).idEmpleado}`, { replace: true })
      else setMsg({ tipo: 'ok', texto: 'Guardado.' })
    },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  const estado = useMutation({
    mutationFn: () => (f.activo ? bajaEmpleado(id, f.fechaEgreso ?? null) : reactivarEmpleado(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos'] }); setMsg({ tipo: 'ok', texto: f.activo ? 'Empleado dado de baja.' : 'Empleado reactivado.' }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); guardar.mutate() }}>
      <Seccion titulo="Identificación">
        <Campo label="Legajo"><input value={f.legajo} onChange={(e) => setF({ ...f, legajo: e.target.value })} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Apellido"><input value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Nombre"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} disabled={dis} className={inputCls} /></Campo>
        <Campo label="CUIL"><input value={texto('cuil')} onChange={(e) => setTexto('cuil', e.target.value)} placeholder="20-12345678-9" disabled={dis} className={inputCls} /></Campo>
        <Campo label="Sexo">
          <select value={texto('sexo')} onChange={(e) => setTexto('sexo', e.target.value)} disabled={dis} className={inputCls}><option value="">—</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">X</option></select>
        </Campo>
        <Campo label="Fecha de nacimiento"><input type="date" value={dia(f.fechaNacimiento)} onChange={(e) => setTexto('fechaNacimiento', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Tipo de documento"><input value={texto('tipoDocumento')} onChange={(e) => setTexto('tipoDocumento', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Número de documento"><input value={texto('numeroDocumento')} onChange={(e) => setTexto('numeroDocumento', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Estado civil">
          <select value={texto('estadoCivil')} onChange={(e) => setTexto('estadoCivil', e.target.value)} disabled={dis} className={inputCls}>
            <option value="">—</option>{['SOLTERO', 'CASADO', 'CONCUBINATO', 'DIVORCIADO', 'SEPARADO', 'VIUDO'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Campo>
      </Seccion>

      <Seccion titulo="Contacto">
        <Campo label="Domicilio" className="lg:col-span-2"><input value={texto('domicilio')} onChange={(e) => setTexto('domicilio', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Localidad"><input value={texto('localidad')} onChange={(e) => setTexto('localidad', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Provincia"><input value={texto('provincia')} onChange={(e) => setTexto('provincia', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Código postal"><input value={texto('codigoPostal')} onChange={(e) => setTexto('codigoPostal', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Teléfono"><input value={texto('telefono')} onChange={(e) => setTexto('telefono', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Email"><input type="email" value={texto('email')} onChange={(e) => setTexto('email', e.target.value)} disabled={dis} className={inputCls} /></Campo>
      </Seccion>

      <Seccion titulo="Datos laborales">
        <Campo label="Fecha de ingreso"><input type="date" value={dia(f.fechaIngreso)} onChange={(e) => setTexto('fechaIngreso', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Fecha de antigüedad (si es distinta)"><input type="date" value={dia(f.fechaAntiguedad)} onChange={(e) => setTexto('fechaAntiguedad', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Antigüedad fija (años, opcional)"><input value={f.antiguedadFija ?? ''} onChange={(e) => setNum('antiguedadFija', e.target.value.replace(',', '.'))} disabled={dis} inputMode="decimal" className={inputCls} /></Campo>
        <Campo label="Fecha de egreso"><input type="date" value={dia(f.fechaEgreso)} onChange={(e) => setTexto('fechaEgreso', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Tarea"><input value={texto('tarea')} onChange={(e) => setTexto('tarea', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Categoría del convenio">
          <select value={f.idCategoria ?? ''} onChange={(e) => setNum('idCategoria', e.target.value)} disabled={dis} className={inputCls}>
            <option value="">Sin categoría</option>
            {cat?.categorias.map((c) => <option key={c.idCategoria} value={c.idCategoria}>{c.convenio} / {c.codigo} — {c.descripcion}</option>)}
          </select>
        </Campo>
        <Campo label="Grupo de conceptos (qué se le liquida)">
          <select value={f.idGrupoConceptos ?? ''} onChange={(e) => setNum('idGrupoConceptos', e.target.value)} disabled={dis} className={inputCls}>
            <option value="">Sin grupo</option>
            {cat?.gruposConceptos.map((g) => <option key={g.idGrupoConceptos} value={g.idGrupoConceptos}>{g.codigo} — {g.descripcion}</option>)}
          </select>
        </Campo>
        <Campo label="Sucursal (su dirección sale en el recibo)">
          <select value={f.idSucursal ?? ''} onChange={(e) => setNum('idSucursal', e.target.value)} disabled={dis} className={inputCls}>
            <option value="">Casa central / sin sucursal</option>
            {cat?.sucursales.map((s) => <option key={s.idSucursal} value={s.idSucursal}>{s.codigo} — {s.nombre}</option>)}
          </select>
        </Campo>
        <Campo label="Modalidad de liquidación">
          <select value={f.liquidacion} onChange={(e) => setF({ ...f, liquidacion: e.target.value })} disabled={dis} className={inputCls}>
            {activos(modalidades.modalidadesLiquidacion).map((m) => <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>)}
            {!modalidades.modalidadesLiquidacion.some((m) => m.activo && m.codigo === f.liquidacion) && <option value={f.liquidacion}>{modalidades.nombreModalidad(f.liquidacion)}</option>}
          </select>
        </Campo>
        <Campo label="Jornada">
          <select value={texto('jornada')} onChange={(e) => setTexto('jornada', e.target.value)} disabled={dis} className={inputCls}><option value="">—</option><option>COMPLETA</option><option>MEDIA</option><option>REDUCIDA</option></select>
        </Campo>
        <Campo label="Horas por mes"><input type="number" step="0.01" value={num('horas')} onChange={(e) => setNum('horas', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Días por mes"><input type="number" step="0.01" value={num('dias')} onChange={(e) => setNum('dias', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Porcentaje de jornada"><input type="number" step="0.01" value={num('porcentaje')} onChange={(e) => setNum('porcentaje', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Días de vacaciones"><input type="number" value={num('diasVacaciones')} onChange={(e) => setNum('diasVacaciones', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Centro de costo"><input value={texto('centroCosto')} onChange={(e) => setTexto('centroCosto', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Lugar de trabajo"><input value={texto('lugarTrabajo')} onChange={(e) => setTexto('lugarTrabajo', e.target.value)} disabled={dis} className={inputCls} /></Campo>
      </Seccion>

      <Seccion titulo="Sueldo y forma de pago">
        <Campo label="Sueldo pactado (vacío = el de la categoría)"><input type="number" step="0.01" value={num('sueldoPactado')} onChange={(e) => setNum('sueldoPactado', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Adicional"><input type="number" step="0.01" value={num('adicional')} onChange={(e) => setNum('adicional', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Auxiliar"><input type="number" step="0.01" value={num('auxiliar')} onChange={(e) => setNum('auxiliar', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Banco"><input value={texto('banco')} onChange={(e) => setTexto('banco', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Cuenta"><input value={texto('cuenta')} onChange={(e) => setTexto('cuenta', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="CBU (22 dígitos)"><input value={texto('cbu')} onChange={(e) => setTexto('cbu', e.target.value)} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Observaciones" className="sm:col-span-2 lg:col-span-3"><textarea rows={2} value={texto('observaciones')} onChange={(e) => setTexto('observaciones', e.target.value)} disabled={dis} className={inputCls} /></Campo>
      </Seccion>

      {msg && <div className="mb-4"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      <div className="flex flex-wrap gap-2">
        {(puedeModificar || esNuevo) && <BotonPrimario type="submit" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : esNuevo ? 'Crear empleado' : 'Guardar cambios'}</BotonPrimario>}
        {!esNuevo && puedeModificar && (
          <BotonSecundario type="button" onClick={() => { if (!f.activo) estado.mutate(); else preguntar('¿Dar de baja al empleado? Se conserva todo su historial.', () => estado.mutate(), { titulo: 'Dar de baja', boton: 'Dar de baja', peligro: true })}}>
            {f.activo ? 'Dar de baja' : 'Reactivar'}
          </BotonSecundario>
        )}
      </div>
    </form>
  )
}

// ---------------------------------------------------------------- familiares

const familiarVacio: Partial<Familiar> = { parentesco: 'HIJO', apellido: '', nombre: '', deducible: true }

function Familiares({ id, puedeModificar }: { id: number; puedeModificar: boolean }) {
  const catalogos = useCatalogos()
  const qc = useQueryClient()
  const { data = [] } = useQuery({ queryKey: ['sueldos', 'familiares', id], queryFn: () => getFamiliares(id) })
  const [f, setF] = useState<Partial<Familiar>>(familiarVacio)
  const [error, setError] = useState<string | null>(null)
  const refrescar = () => qc.invalidateQueries({ queryKey: ['sueldos', 'familiares', id] })

  const guardar = useMutation({
    mutationFn: () => (f.idFamiliar ? modificarFamiliar(id, f.idFamiliar, f) : agregarFamiliar(id, f)),
    onSuccess: () => { setF(familiarVacio); setError(null); refrescar() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  const borrar = useMutation({ mutationFn: (idFam: number) => eliminarFamiliar(id, idFam), onSuccess: refrescar })

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 font-medium">Parentesco</th><th className="px-4 py-2 font-medium">Apellido y nombre</th><th className="px-4 py-2 font-medium">Nacimiento</th>
            <th className="px-4 py-2 font-medium">Deduce en Ganancias</th><th className="px-4 py-2 font-medium">Discapacidad</th><th className="px-4 py-2" />
          </tr></thead>
          <tbody>
            {data.map((x) => (
              <tr key={x.idFamiliar} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2">{catalogos.nombreParentesco(x.parentesco)}</td><td className="px-4 py-2">{x.apellido}, {x.nombre}</td>
                <td className="px-4 py-2">{x.fechaNacimiento ? new Date(x.fechaNacimiento).toLocaleDateString('es-AR') : ''}</td>
                <td className="px-4 py-2">{x.deducible ? 'Sí' : 'No'}</td><td className="px-4 py-2">{x.discapacidad ? 'Sí' : 'No'}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {puedeModificar && <button onClick={() => setF({ ...x, fechaNacimiento: dia(x.fechaNacimiento) })} className="text-xs text-blue-700 hover:underline mr-3">Editar</button>}
                  {puedeModificar && <button title="Borrar" onClick={() => { preguntar('¿Borrar este familiar?', () => borrar.mutate(x.idFamiliar), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} className="text-red-500 align-middle"><Trash2 size={14} /></button>}
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin familiares cargados</td></tr>}
          </tbody>
        </table>
      </div>

      {puedeModificar && (
        <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{f.idFamiliar ? 'Editar familiar' : 'Agregar familiar'}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Campo label="Parentesco"><select value={f.parentesco} onChange={(e) => setF({ ...f, parentesco: e.target.value })} className={inputCls}>
              {activos(catalogos.parentescos).map((p) => <option key={p.codigo} value={p.codigo}>{p.descripcion}</option>)}
              {!catalogos.parentescos.some((p) => p.activo && p.codigo === f.parentesco) && <option value={f.parentesco}>{catalogos.nombreParentesco(f.parentesco ?? null)}</option>}
            </select></Campo>
            <Campo label="Apellido"><input value={f.apellido ?? ''} onChange={(e) => setF({ ...f, apellido: e.target.value })} className={inputCls} /></Campo>
            <Campo label="Nombre"><input value={f.nombre ?? ''} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={inputCls} /></Campo>
            <Campo label="Fecha de nacimiento"><input type="date" value={dia(f.fechaNacimiento ?? null)} onChange={(e) => setF({ ...f, fechaNacimiento: e.target.value || null })} className={inputCls} /></Campo>
            <Campo label="CUIL"><input value={f.cuil ?? ''} onChange={(e) => setF({ ...f, cuil: e.target.value || null })} className={inputCls} /></Campo>
            <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={!!f.deducible} onChange={(e) => setF({ ...f, deducible: e.target.checked })} /> Se deduce en Ganancias</label>
            <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={!!f.discapacidad} onChange={(e) => setF({ ...f, discapacidad: e.target.checked })} /> Discapacidad</label>
          </div>
          {error && <div className="mt-3"><Mensaje tipo="error">{error}</Mensaje></div>}
          <div className="flex gap-2 mt-4">
            <BotonPrimario type="submit" disabled={guardar.isPending || !f.apellido?.trim() || !f.nombre?.trim()}>{f.idFamiliar ? 'Guardar cambios' : 'Agregar'}</BotonPrimario>
            {f.idFamiliar && <BotonSecundario type="button" onClick={() => setF(familiarVacio)}>Cancelar</BotonSecundario>}
          </div>
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- novedades

function Novedades({ id, puedeModificar }: { id: number; puedeModificar: boolean }) {
  const qc = useQueryClient()
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [tipo, setTipo] = useState('')
  const [mes, setMes] = useState(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`)
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { data: cat } = useQuery({ queryKey: ['sueldos', 'catalogos'], queryFn: getCatalogos })
  const { data = [] } = useQuery({ queryKey: ['sueldos', 'novedades', id, anio], queryFn: () => getNovedades(id, anio) })
  const refrescar = () => qc.invalidateQueries({ queryKey: ['sueldos', 'novedades', id] })

  const guardar = useMutation({
    mutationFn: () => guardarNovedad(id, { codigoTipo: tipo, fecha: `${mes}-01`, valor: valor.trim() || null }),
    onSuccess: () => { setValor(''); setError(null); refrescar() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  const borrar = useMutation({ mutationFn: (n: { codigoTipo: string; fecha: string }) => eliminarNovedad(id, n.codigoTipo, n.fecha.slice(0, 10)), onSuccess: refrescar })
  const tipoSel = cat?.tiposNovedad.find((t) => t.codigo === tipo)

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm text-gray-600">Año</label>
        <input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={`${inputCls} w-28`} />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 font-medium">Mes</th><th className="px-4 py-2 font-medium">Novedad</th><th className="px-4 py-2 font-medium text-right">Valor</th><th className="px-4 py-2" />
          </tr></thead>
          <tbody>
            {data.map((n) => (
              <tr key={`${n.codigoTipo}${n.fecha}`} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2">{new Date(n.fecha).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</td>
                <td className="px-4 py-2">{n.descripcion}</td><td className="px-4 py-2 text-right tabular-nums">{n.valor}</td>
                <td className="px-4 py-2 text-right">{puedeModificar && <button title="Borrar" onClick={() => borrar.mutate(n)} className="text-red-500"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Sin novedades en {anio}</td></tr>}
          </tbody>
        </table>
      </div>

      {puedeModificar && (
        <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Cargar novedad</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <Campo label="Novedad">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
                <option value="">Elegí…</option>{cat?.tiposNovedad.map((t) => <option key={t.codigo} value={t.codigo}>{t.descripcion}</option>)}
              </select>
            </Campo>
            <Campo label="Mes"><input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={inputCls} /></Campo>
            <Campo label={`Valor${tipoSel ? ` (${tipoSel.tipoDato.toLowerCase()})` : ''}`}><input value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} /></Campo>
          </div>
          <p className="text-xs text-gray-500 mt-2">Si ya hay una carga de esa novedad en ese mes, se reemplaza.</p>
          {error && <div className="mt-3"><Mensaje tipo="error">{error}</Mensaje></div>}
          <div className="mt-4"><BotonPrimario type="submit" disabled={guardar.isPending || !tipo || !mes}>Guardar novedad</BotonPrimario></div>
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- página

/** Ficha del empleado con sus familiares y novedades (o el alta de uno nuevo). */
export default function EmpleadoPage() {
  const { id: idParam } = useParams()
  const navigate = useNavigate()
  const id = idParam ? Number(idParam) : 0
  const token = useAuthStore((s) => s.token)
  const permisos = permisosDelToken(token)
  const puedeModificar = tienePermiso(permisos, 'SLD', 'modificar')
  const [tab, setTab] = useState<Pestania>('datos')
  const { data: ficha } = useQuery({ queryKey: ['sueldos', 'empleado', id], queryFn: () => getEmpleado(id), enabled: id > 0 })

  const tabs: { clave: Pestania; titulo: string }[] = [{ clave: 'datos', titulo: 'Datos' }, ...(id > 0 ? [{ clave: 'arca' as const, titulo: 'ARCA' }, { clave: 'conceptos' as const, titulo: 'Conceptos' }, { clave: 'familiares' as const, titulo: 'Familiares' }, { clave: 'novedades' as const, titulo: 'Novedades' }] : [])]

  return (
    <div>
      <button onClick={() => navigate('/sueldos/empleados')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 mb-2"><ArrowLeft size={14} /> Empleados</button>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{id === 0 ? 'Nuevo empleado' : ficha ? `${ficha.apellido}, ${ficha.nombre}` : 'Empleado'}{ficha && <span className="ml-3 text-sm font-normal text-gray-400">Legajo {ficha.legajo}{!ficha.activo && ' · De baja'}</span>}</h1>

      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {tabs.map((t) => (
          <button key={t.clave} onClick={() => setTab(t.clave)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${tab === t.clave ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{t.titulo}</button>
        ))}
      </div>

      {tab === 'datos' && <Datos id={id} puedeModificar={puedeModificar} />}
      {tab === 'arca' && id > 0 && <ArcaEmpleado id={id} puedeModificar={puedeModificar} />}
      {tab === 'conceptos' && id > 0 && <ConceptosEmpleado id={id} puede={puedeModificar} />}
      {tab === 'familiares' && id > 0 && <Familiares id={id} puedeModificar={puedeModificar} />}
      {tab === 'novedades' && id > 0 && <Novedades id={id} puedeModificar={puedeModificar} />}
    </div>
  )
}
