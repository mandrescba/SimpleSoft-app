import { getConceptosGenerales, guardarConceptoGeneral, quitarConceptoGeneral } from '../../api/configuracion'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import ConceptosAsignados from '../../components/sueldos/ConceptosAsignados'

/** Conceptos generales: se agregan a todos los recibos de la empresa (por ejemplo el S.A.C. en junio y diciembre). */
export default function ConceptosGeneralesPage() {
  const puede = tienePermiso(permisosDelToken(useAuthStore((s) => s.token)), 'SLD', 'modificar')
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Conceptos generales</h1>
      <p className="text-gray-500 mb-4">Conceptos que se aplican a todos los recibos de la empresa, sin asignarlos empleado por empleado.</p>
      <div className="bg-blue-50 border border-blue-100 text-blue-900 text-sm rounded-xl px-4 py-3 mb-4">
        Por ejemplo, para calcular el aguinaldo en la liquidación de junio, agregá el concepto S.A.C. con «Aparece en: Aguinaldo (SAC)» y quedará precargado en todos los recibos de ese tipo.
        Los conceptos se agregan al <b>crear</b> el recibo: para que aparezca en uno que ya está liquidado, volvé a liquidar.
      </div>
      <ConceptosAsignados
        puede={puede} titulo="Agregar un concepto general" vacio="Todavía no hay conceptos generales"
        ayuda="Si el empleado ya tiene el mismo concepto propio o en su grupo, manda el del empleado."
        fuente={{
          clave: ['sueldos', 'conceptos-generales'],
          cargar: getConceptosGenerales,
          guardar: guardarConceptoGeneral,
          quitar: quitarConceptoGeneral,
          tambienRefrescar: [['sueldos', 'empleado-conceptos']],
        }}
      />
    </div>
  )
}
