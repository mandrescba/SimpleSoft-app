import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { crearTipoNovedad, eliminarTipoNovedad, getTiposNovedad, modificarTipoNovedad, type TipoDatoNovedad, type TipoNovedad } from '../../api/configuracion'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import Modal from '../../components/ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { preguntar } from '../../components/ui/Confirmar'

const TIPOS: { v: TipoDatoNovedad; t: string }[] = [{ v: 'DECIMAL', t: 'Decimal (horas, importes)' }, { v: 'ENTERO', t: 'Entero (cantidades, días)' }, { v: 'TEXTO', t: 'Texto' }, { v: 'FECHA', t: 'Fecha' }]
const nombreTipo = (v: string) => TIPOS.find((t) => t.v === v)?.t.split(' (')[0] ?? v

interface Form { codigo: string; descripcion: string; tipoDato: TipoDatoNovedad; longitud: string; decimales: string }
const vacio: Form = { codigo: '', descripcion: '', tipoDato: 'DECIMAL', longitud: '', decimales: '2' }
const aNum = (t: string) => (t.trim() === '' ? null : Number(t))

function Formulario({ editando, onClose }: { editando: TipoNovedad | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState<Form>(editando
    ? { codigo: editando.codigo, descripcion: editando.descripcion, tipoDato: editando.tipoDato, longitud: editando.longitud === null ? '' : String(editando.longitud), decimales: editando.decimales === null ? '' : String(editando.decimales) }
    : vacio)
  const [error, setError] = useState<string | null>(null)
  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { codigo: f.codigo, descripcion: f.descripcion, tipoDato: f.tipoDato, longitud: f.tipoDato === 'FECHA' ? null : aNum(f.longitud), decimales: f.tipoDato === 'DECIMAL' ? aNum(f.decimales) : null }
      return editando ? modificarTipoNovedad(editando.idTipoNovedad, cuerpo) : crearTipoNovedad(cuerpo)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'tipos-novedad'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'catalogos'] }); onClose() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  const conNovedades = (editando?.novedades ?? 0) > 0
  return (
    <Modal titulo={editando ? `Tipo de novedad ${editando.codigo}` : 'Nuevo tipo de novedad'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="grid sm:grid-cols-2 gap-4">
        <Campo label="Código" className="sm:col-span-2">
          <input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase().replace(/\s/g, '_') })} disabled={!!editando} maxLength={40} placeholder="HORA_EXTRA" className={`${inputCls} font-mono`} />
          <p className="text-xs text-gray-400 mt-1">Es el nombre que se usa en las fórmulas (sin espacios; usá guion bajo). No se puede cambiar después.</p>
        </Campo>
        <Campo label="Descripción" className="sm:col-span-2"><input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} maxLength={100} placeholder="Horas extra al 50%" className={inputCls} /></Campo>
        <Campo label="Tipo de dato" className="sm:col-span-2">
          <select value={f.tipoDato} onChange={(e) => setF({ ...f, tipoDato: e.target.value as TipoDatoNovedad })} disabled={conNovedades} className={inputCls}>
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
          </select>
          {conNovedades && <p className="text-xs text-amber-700 mt-1">Ya tiene {editando!.novedades} novedades cargadas: no se puede cambiar el tipo de dato.</p>}
        </Campo>
        {f.tipoDato !== 'FECHA' && <Campo label="Longitud (opcional)"><input type="number" min={1} max={100} value={f.longitud} onChange={(e) => setF({ ...f, longitud: e.target.value })} className={inputCls} /></Campo>}
        {f.tipoDato === 'DECIMAL' && <Campo label="Decimales"><input type="number" min={0} max={8} value={f.decimales} onChange={(e) => setF({ ...f, decimales: e.target.value })} className={inputCls} /></Campo>}
        {error && <div className="sm:col-span-2"><Mensaje tipo="error">{error}</Mensaje></div>}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={guardar.isPending || !f.codigo.trim() || !f.descripcion.trim()}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Tipos de novedad: los datos que se cargan mes a mes por empleado (horas extra, adelantos...) y que las fórmulas usan por su código. */
export default function TiposNovedadPage() {
  const qc = useQueryClient()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const puedeCrear = tienePermiso(permisos, 'SLD', 'crear')
  const puedeModificar = tienePermiso(permisos, 'SLD', 'modificar')
  const puedeEliminar = tienePermiso(permisos, 'SLD', 'eliminar')
  const [form, setForm] = useState<{ editando: TipoNovedad | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data, isLoading, isError, error: errorCarga } = useQuery({ queryKey: ['sueldos', 'tipos-novedad'], queryFn: getTiposNovedad })
  const pag = usePaginado(data)
  const borrar = useMutation({
    mutationFn: (id: number) => eliminarTipoNovedad(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'tipos-novedad'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'catalogos'] }) },
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tipos de novedad</h1>
          <p className="text-gray-500">Datos que se cargan por mes a cada empleado (horas extra, adelantos...). El código de cada tipo se usa como variable en las fórmulas.</p>
        </div>
        {puedeCrear && <BotonPrimario onClick={() => { setError(null); setForm({ editando: null }) }} className="inline-flex items-center gap-1.5 shrink-0"><Plus size={16} /> Nuevo tipo</BotonPrimario>}
      </div>
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(errorCarga)}</Mensaje>}
      {error && <div className="mb-3"><Mensaje tipo="error">{error}</Mensaje></div>}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Código</th><th className="px-4 py-2 font-medium">Descripción</th><th className="px-4 py-2 font-medium">Tipo de dato</th>
              <th className="px-4 py-2 font-medium">Formato</th><th className="px-4 py-2 font-medium text-right">Novedades cargadas</th><th className="px-4 py-2" />
            </tr></thead>
            <tbody>
              {pag.filas.map((t) => (
                <tr key={t.idTipoNovedad} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{t.codigo}</td>
                  <td className="px-4 py-2">{t.descripcion}</td>
                  <td className="px-4 py-2 text-gray-600">{nombreTipo(t.tipoDato)}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{[t.longitud !== null ? `${t.longitud} caracteres` : '', t.decimales !== null ? `${t.decimales} decimales` : ''].filter(Boolean).join(' · ')}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-500">{t.novedades}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {puedeModificar && <button title="Modificar" onClick={() => { setError(null); setForm({ editando: t }) }} className="text-gray-500 hover:text-blue-700 mr-2"><Pencil size={14} /></button>}
                    {puedeEliminar && <button title="Borrar" onClick={() => { setError(null); preguntar(`¿Borrar el tipo de novedad ${t.codigo}?`, () => borrar.mutate(t.idTipoNovedad), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Todavía no hay tipos de novedad</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
      {form && <Formulario editando={form.editando} onClose={() => setForm(null)} />}
    </div>
  )
}
