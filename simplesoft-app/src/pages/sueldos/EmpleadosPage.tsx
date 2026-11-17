import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { FileUp, Plus } from 'lucide-react'
import { getEmpleados } from '../../api/empleados'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { BotonPrimario, BotonSecundario, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { ThOrden, useOrden, type Accesor } from '../../components/ui/Orden'
import type { EmpleadoLista } from '../../types/sueldos'

const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString('es-AR') : '')

/** Qué se compara al ordenar por cada columna. El legajo se ordena "naturalmente" (2 antes que 10). */
const ACCESORES: Record<string, Accesor<EmpleadoLista>> = {
  legajo: (e) => e.legajo,
  nombre: (e) => `${e.apellido} ${e.nombre}`,
  cuil: (e) => e.cuil,
  categoria: (e) => e.categoria,
  ingreso: (e) => (e.fechaIngreso ? new Date(e.fechaIngreso).getTime() : null),
  estado: (e) => (e.activo ? 0 : 1),
}

/** Listado de empleados de la empresa. */
export default function EmpleadosPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const puedeCrear = tienePermiso(permisosDelToken(token), 'SLD', 'crear')
  const [buscar, setBuscar] = useState('')
  const [bajas, setBajas] = useState(false)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'empleados', buscar, bajas], queryFn: () => getEmpleados(buscar, bajas) })
  const orden = useOrden(data, ACCESORES, { col: 'legajo', dir: 'asc' }, 'legajo')   // por defecto, por legajo
  const pag = usePaginado(orden.lista)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Empleados</h1>
          <p className="text-gray-500">Legajos de la empresa, con sus familiares y novedades.</p>
        </div>
        {puedeCrear && (
          <div className="flex gap-2 shrink-0">
            <BotonSecundario onClick={() => navigate('/sueldos/importar/empleados')} className="inline-flex items-center gap-1.5"><FileUp size={16} /> Importar desde Excel</BotonSecundario>
            <BotonPrimario onClick={() => navigate('/sueldos/empleados/nuevo')} className="inline-flex items-center gap-1.5"><Plus size={16} /> Nuevo empleado</BotonPrimario>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por legajo, apellido, nombre o CUIL" className={`${inputCls} max-w-sm`} />
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={bajas} onChange={(e) => setBajas(e.target.checked)} /> Incluir dados de baja
        </label>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}

      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                {([['legajo', 'Legajo'], ['nombre', 'Apellido y nombre'], ['cuil', 'CUIL'], ['categoria', 'Categoría'], ['ingreso', 'Ingreso'], ['estado', 'Estado']] as const).map(([col, titulo]) => (
                  <ThOrden key={col} col={col} titulo={titulo} orden={orden} onOrdenar={() => pag.setPagina(1)} />
                ))}
              </tr>
            </thead>
            <tbody>
              {pag.filas.map((e) => (
                <tr key={e.idEmpleado} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${e.activo ? '' : 'text-gray-400'}`}>
                  <td className="px-4 py-2 font-mono text-xs"><Link to={`/sueldos/empleados/${e.idEmpleado}`} className="text-blue-700 hover:underline">{e.legajo}</Link></td>
                  <td className="px-4 py-2"><Link to={`/sueldos/empleados/${e.idEmpleado}`} className="hover:text-blue-700">{e.apellido}, {e.nombre}</Link><div className="text-xs text-gray-400">{e.tarea}</div></td>
                  <td className="px-4 py-2">{e.cuil}</td>
                  <td className="px-4 py-2">{e.categoria}</td>
                  <td className="px-4 py-2">{fecha(e.fechaIngreso)}</td>
                  <td className="px-4 py-2 text-xs">{e.activo ? <span className="text-green-700">Activo</span> : `Baja ${fecha(e.fechaEgreso)}`}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No hay empleados</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">{data.length} empleados</div>
        </div>
      )}
    </div>
  )
}
