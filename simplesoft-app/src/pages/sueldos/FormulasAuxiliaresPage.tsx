import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import { crearFormulaAux, eliminarFormulaAux, getFormulasAux, modificarFormulaAux, validarFormulaAux, type FormulaAux, type ResultadoValidacion } from '../../api/configuracion'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import Modal from '../../components/ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { preguntar } from '../../components/ui/Confirmar'

function Formulario({ editando, onClose }: { editando: FormulaAux | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState(editando?.codigo ?? '')
  const [descripcion, setDescripcion] = useState(editando?.descripcion ?? '')
  const [formato, setFormato] = useState(editando?.formato ?? '')
  const [formula, setFormula] = useState(editando?.formula ?? '')
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null)
  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { codigo, descripcion: descripcion.trim() || null, formato: formato.trim() || null, formula }
      return editando ? modificarFormulaAux(editando.idFormula, cuerpo) : crearFormulaAux(cuerpo)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'formulas-auxiliares'] }); onClose() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  const comprobar = useMutation({ mutationFn: () => validarFormulaAux(formula), onSuccess: setResultado, onError: (e) => setError(mensajeDeError(e)) })
  return (
    <Modal titulo={editando ? `Fórmula auxiliar ${editando.codigo}` : 'Nueva fórmula auxiliar'} onClose={onClose} ancho="max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="grid sm:grid-cols-2 gap-4">
        <Campo label="Código">
          <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, '_'))} disabled={!!editando} maxLength={40} placeholder="MEJOR_SUELDO" className={`${inputCls} font-mono`} />
        </Campo>
        <Campo label="Descripción (opcional)"><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={150} className={inputCls} /></Campo>
        <Campo label="Formato de uso (opcional)" className="sm:col-span-2">
          <input value={formato} onChange={(e) => setFormato(e.target.value)} maxLength={100} placeholder="SUMA_NOVEDADES(<mes>,<novedad>)" className={`${inputCls} font-mono`} />
          <p className="text-xs text-gray-400 mt-1">Cómo se escribe al usarla, para recordarlo. Es solo una ayuda.</p>
        </Campo>
        <Campo label="Fórmula" className="sm:col-span-2">
          <textarea value={formula} onChange={(e) => { setFormula(e.target.value); setResultado(null) }} rows={5} spellCheck={false} placeholder="RECIBOS(0..-5,MAX,TOTAL_REMUNERATIVO)" className={`${inputCls} font-mono`} />
          <p className="text-xs text-gray-400 mt-1">
            Al usar el código en otra fórmula, el sistema lo reemplaza por este contenido. Si recibe parámetros, escribilos como <code>?0</code>, <code>?1</code>… (o <code>?</code> si es uno solo).
          </p>
        </Campo>
        {resultado && (
          <div className="sm:col-span-2">
            {resultado.valida
              ? <Mensaje tipo={resultado.advertencias.length ? 'aviso' : 'ok'}><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> La fórmula es válida.</span>{resultado.advertencias.map((a) => <span key={a} className="block">{a}</span>)}</Mensaje>
              : <Mensaje tipo="error">{resultado.error}</Mensaje>}
          </div>
        )}
        {error && <div className="sm:col-span-2"><Mensaje tipo="error">{error}</Mensaje></div>}
        <div className="sm:col-span-2 flex justify-between gap-2">
          <BotonSecundario type="button" onClick={() => { setError(null); comprobar.mutate() }} disabled={!formula.trim() || comprobar.isPending}>Comprobar fórmula</BotonSecundario>
          <div className="flex gap-2">
            <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
            <BotonPrimario type="submit" disabled={guardar.isPending || !codigo.trim() || !formula.trim()}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</BotonPrimario>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/** Fórmulas auxiliares: fragmentos reutilizables (MEJOR_SUELDO, CONCEPTOANT...) que el sistema expande dentro de otras fórmulas. */
export default function FormulasAuxiliaresPage() {
  const qc = useQueryClient()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const puedeCrear = tienePermiso(permisos, 'SLD', 'crear')
  const puedeModificar = tienePermiso(permisos, 'SLD', 'modificar')
  const puedeEliminar = tienePermiso(permisos, 'SLD', 'eliminar')
  const [form, setForm] = useState<{ editando: FormulaAux | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buscar, setBuscar] = useState('')
  const { data, isLoading, isError, error: errorCarga } = useQuery({ queryKey: ['sueldos', 'formulas-auxiliares'], queryFn: getFormulasAux })
  const filtradas = (data ?? []).filter((f) => !buscar.trim() || `${f.codigo} ${f.descripcion ?? ''} ${f.formula}`.toLowerCase().includes(buscar.trim().toLowerCase()))
  const pag = usePaginado(filtradas)
  const borrar = useMutation({
    mutationFn: (id: number) => eliminarFormulaAux(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sueldos', 'formulas-auxiliares'] }),
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fórmulas auxiliares</h1>
          <p className="text-gray-500">Fragmentos de fórmula reutilizables. Al escribir su código en la fórmula de un concepto, el sistema lo reemplaza por su contenido.</p>
        </div>
        {puedeCrear && <BotonPrimario onClick={() => { setError(null); setForm({ editando: null }) }} className="inline-flex items-center gap-1.5 shrink-0"><Plus size={16} /> Nueva fórmula</BotonPrimario>}
      </div>
      <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por código, descripción o contenido" className={`${inputCls} max-w-sm mb-4`} />
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(errorCarga)}</Mensaje>}
      {error && <div className="mb-3"><Mensaje tipo="error">{error}</Mensaje></div>}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Código</th><th className="px-4 py-2 font-medium">Descripción y uso</th><th className="px-4 py-2 font-medium">Fórmula</th><th className="px-4 py-2" />
            </tr></thead>
            <tbody>
              {pag.filas.map((f) => (
                <tr key={f.idFormula} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 align-top">
                  <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{f.codigo}</td>
                  <td className="px-4 py-2">{f.descripcion}{f.formato && <div className="text-xs font-mono text-gray-400">{f.formato}</div>}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600 max-w-md"><div className="line-clamp-2 break-all">{f.formula}</div></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {puedeModificar && <button title="Modificar" onClick={() => { setError(null); setForm({ editando: f }) }} className="text-gray-500 hover:text-blue-700 mr-2"><Pencil size={14} /></button>}
                    {puedeEliminar && <button title="Borrar" onClick={() => { setError(null); preguntar(`¿Borrar la fórmula auxiliar ${f.codigo}?`, () => borrar.mutate(f.idFormula), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No hay fórmulas auxiliares</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
      {form && <Formulario editando={form.editando} onClose={() => setForm(null)} />}
    </div>
  )
}
