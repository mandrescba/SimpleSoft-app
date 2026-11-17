import { getConceptosGrupo, guardarConceptoGrupo, quitarConceptoGrupo } from '../../api/grupos'
import ConceptosAsignados from './ConceptosAsignados'

/**
 * Conceptos de un grupo de conceptos, con unidad, importe, vigencia y tipo de liquidación propios. Lo usan la pantalla del grupo y la
 * pestaña Conceptos del convenio. <paramref name="alCambiar"/> avisa al padre para refrescar contadores.
 */
export default function ConceptosDeGrupo({ idGrupo, puede, alCambiar }: { idGrupo: number; puede: boolean; alCambiar?: () => void }) {
  return (
    <ConceptosAsignados
      puede={puede} alCambiar={alCambiar} titulo="Agregar un concepto al grupo" vacio="El grupo todavía no tiene conceptos"
      ayuda="Unidad, importe, vigencia y tipo de liquidación propios del grupo pisan a los del concepto."
      fuente={{
        clave: ['sueldos', 'grupo-conceptos', idGrupo],
        cargar: () => getConceptosGrupo(idGrupo),
        guardar: (d) => guardarConceptoGrupo(idGrupo, d),
        quitar: (codigo, tipo) => quitarConceptoGrupo(idGrupo, codigo, tipo),
        tambienRefrescar: [['sueldos', 'grupos'], ['sueldos', 'grupos-de-concepto']],
      }}
    />
  )
}
