import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getConceptosEmpleado, guardarConceptoEmpleado, quitarConceptoEmpleado } from '../../api/configuracion'
import { mensajeDeError } from '../../api/axios'
import type { RenglonConvenio } from '../../types/sueldos'
import { formatoDinero, formatoNumero } from '../../lib/formato'
import { Mensaje } from '../ui/Campos'
import ConceptosAsignados, { fechaCorta } from './ConceptosAsignados'
import { useCatalogos } from '../../hooks/useCatalogos'

/** Tabla de solo lectura de conceptos que le llegan al empleado por otro lado (su grupo, los generales de la empresa). */
function Heredados({ titulo, nota, renglones }: { titulo: React.ReactNode; nota?: React.ReactNode; renglones: RenglonConvenio[] }) {
  const cat = useCatalogos()
  return (
    <section className="mb-6">
      <h2 className="font-semibold text-gray-800 text-sm">{titulo}</h2>
      {nota && <p className="text-xs text-gray-500 mb-2">{nota}</p>}
      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-x-auto mt-2">
        <table className="w-full text-sm">
          <tbody>
            {renglones.map((r) => (
              <tr key={`${r.codigo}|${r.tipoLiquidacion}`} className="border-b border-gray-100 last:border-0 text-gray-600">
                <td className="px-4 py-1.5 font-mono text-xs w-24">{r.codigo}</td><td className="px-4 py-1.5">{r.descripcion}</td>
                <td className="px-4 py-1.5 text-gray-500">{cat.nombreTipoLiquidacion(r.tipoLiquidacion)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{r.unidad === null ? '' : formatoNumero(r.unidad)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{r.importe === null ? '' : formatoDinero(r.importe)}</td>
                <td className="px-4 py-1.5 text-xs text-gray-500">{r.vigenciaDesde || r.vigenciaHasta ? `${r.vigenciaDesde ? fechaCorta(r.vigenciaDesde) : '…'} a ${fechaCorta(r.vigenciaHasta)}` : ''}</td>
              </tr>
            ))}
            {renglones.length === 0 && <tr><td className="px-4 py-3 text-center text-gray-400 text-sm">Ninguno</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/**
 * Pestaña Conceptos del empleado: lo que se le liquida además de lo que calculan las fórmulas. Muestra, de solo lectura, los conceptos de su grupo
 * (el suyo o el de su convenio) y los generales de la empresa, y permite cargar los conceptos propios (un préstamo con vigencia, un adicional personal).
 */
export default function ConceptosEmpleado({ id, puede }: { id: number; puede: boolean }) {
  const { data, isError, error } = useQuery({ queryKey: ['sueldos', 'empleado-conceptos', id], queryFn: () => getConceptosEmpleado(id) })
  return (
    <div>
      <div className="bg-blue-50 border border-blue-100 text-blue-900 text-sm rounded-xl px-4 py-3 mb-5">
        Al crear su recibo se cargan, en este orden: <b>sus conceptos propios</b>, los de <b>su grupo de conceptos</b> (el suyo o, si no tiene, el de su convenio) y los <b>generales</b> de la empresa.
        Si un concepto está en más de un lugar, manda el más específico.
      </div>
      {isError && <div className="mb-4"><Mensaje tipo="error">{mensajeDeError(error)}</Mensaje></div>}

      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 text-sm mb-1">Conceptos propios del empleado</h2>
        <ConceptosAsignados
          puede={puede} titulo="Agregar un concepto al empleado" vacio="Este empleado no tiene conceptos propios"
          ayuda="Se aplican solo a este empleado, con la unidad, el importe y la vigencia que indiques (por ejemplo, un préstamo)."
          fuente={{
            clave: ['sueldos', 'empleado-conceptos', id, 'propios'],
            cargar: async () => (await getConceptosEmpleado(id)).propios,
            guardar: (d) => guardarConceptoEmpleado(id, d),
            quitar: (codigo, tipo) => quitarConceptoEmpleado(id, codigo, tipo),
            tambienRefrescar: [['sueldos', 'empleado-conceptos', id]],
          }}
        />
      </section>

      {data && (
        <>
          <Heredados
            titulo={data.grupo
              ? <>Del grupo de conceptos <Link to={`/sueldos/grupos/${data.grupo.idGrupoConceptos}`} className="text-blue-700 hover:underline">{data.grupo.codigo}</Link> <span className="font-normal text-gray-500">— {data.grupo.descripcion}</span></>
              : 'Del grupo de conceptos'}
            nota={data.grupo
              ? (data.grupo.origen === 'EMPLEADO' ? 'Es el grupo asignado en la ficha del empleado.' : 'El empleado no tiene un grupo propio: usa el de su convenio.')
              : 'El empleado no tiene grupo de conceptos ni su convenio tiene uno: asignalo en la solapa Datos o en el convenio.'}
            renglones={data.delGrupo} />
          <Heredados
            titulo={<>Generales de la empresa <Link to="/sueldos/conceptos-generales" className="ml-2 text-xs font-normal text-blue-700 hover:underline">Administrar</Link></>}
            renglones={data.generales} />
        </>
      )}
    </div>
  )
}
