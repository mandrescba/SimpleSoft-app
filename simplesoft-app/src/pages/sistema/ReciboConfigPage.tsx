import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, RotateCcw, Trash2, Upload } from 'lucide-react'
import {
  bajaSucursal, crearSucursal, getConfigRecibo, getLogoUrl, getSucursales, modificarSucursal, quitarLogo, reactivarSucursal, setFormatoRecibo, subirLogo, type SucursalForm,
} from '../../api/sistema'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import Modal from '../../components/ui/Modal'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import type { Sucursal } from '../../types/sueldos'
import { preguntar } from '../../components/ui/Confirmar'

const vacia: SucursalForm = { codigo: '', nombre: '', domicilio: null, localidad: null, provincia: null, codigoPostal: null, telefono: null }

function FormSucursal({ actual, onClose }: { actual: Sucursal | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState<SucursalForm>(actual ? { ...actual } : vacia)
  const [error, setError] = useState<string | null>(null)
  const txt = (k: keyof SucursalForm) => (f[k] ?? '') as string
  const set = (k: keyof SucursalForm, v: string) => setF({ ...f, [k]: v })
  const guardar = useMutation({
    mutationFn: () => (actual ? modificarSucursal(actual.idSucursal, f) : crearSucursal(f)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sistema', 'sucursales'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'catalogos'] }); onClose() },
    onError: (e) => setError(mensajeDeError(e)),
  })
  return (
    <Modal titulo={actual ? 'Modificar sucursal' : 'Nueva sucursal'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); guardar.mutate() }} className="grid sm:grid-cols-2 gap-4">
        <Campo label="Código"><input value={f.codigo} onChange={(e) => set('codigo', e.target.value)} disabled={!!actual} className={inputCls} /></Campo>
        <Campo label="Nombre"><input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Domicilio" className="sm:col-span-2"><input value={txt('domicilio')} onChange={(e) => set('domicilio', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Localidad"><input value={txt('localidad')} onChange={(e) => set('localidad', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Provincia"><input value={txt('provincia')} onChange={(e) => set('provincia', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Código postal"><input value={txt('codigoPostal')} onChange={(e) => set('codigoPostal', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Teléfono"><input value={txt('telefono')} onChange={(e) => set('telefono', e.target.value)} className={inputCls} /></Campo>
        {error && <div className="sm:col-span-2"><Mensaje tipo="error">{error}</Mensaje></div>}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={guardar.isPending || !f.codigo.trim() || !f.nombre.trim()}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Logo, formato de impresión del recibo y sucursales de la empresa en la que se está trabajando. */
export default function ReciboConfigPage() {
  const qc = useQueryClient()
  const puedeModificar = tienePermiso(permisosDelToken(useAuthStore((s) => s.token)), 'SYS', 'modificar')
  const archivo = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [edit, setEdit] = useState<Sucursal | 'nueva' | null>(null)

  const { data: cfg } = useQuery({ queryKey: ['sistema', 'recibo-config'], queryFn: getConfigRecibo })
  const { data: sucursales } = useQuery({ queryKey: ['sistema', 'sucursales'], queryFn: getSucursales })

  // el logo se baja con el token y se muestra como imagen local
  useEffect(() => {
    let url: string | null = null
    let vivo = true
    if (cfg?.tieneLogo) getLogoUrl().then((u) => { url = u; if (vivo) setLogoUrl(u) }).catch(() => setLogoUrl(null))
    else setLogoUrl(null)
    return () => { vivo = false; if (url) URL.revokeObjectURL(url) }
  }, [cfg?.tieneLogo])

  const refrescar = () => qc.invalidateQueries({ queryKey: ['sistema', 'recibo-config'] })
  const alFallar = (e: unknown) => setMsg({ tipo: 'error', texto: mensajeDeError(e) })

  const subir = useMutation({ mutationFn: (f: File) => subirLogo(f), onSuccess: () => { setMsg({ tipo: 'ok', texto: 'Logo actualizado.' }); refrescar() }, onError: alFallar })
  const quitar = useMutation({ mutationFn: quitarLogo, onSuccess: () => { setMsg({ tipo: 'ok', texto: 'Logo quitado.' }); refrescar() }, onError: alFallar })
  const formato = useMutation({ mutationFn: (f: string) => setFormatoRecibo(f), onSuccess: () => { setMsg({ tipo: 'ok', texto: 'Formato guardado.' }); refrescar() }, onError: alFallar })
  const baja = useMutation({ mutationFn: (id: number) => bajaSucursal(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['sistema', 'sucursales'] }), onError: alFallar })
  const reactivar = useMutation({ mutationFn: (id: number) => reactivarSucursal(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['sistema', 'sucursales'] }), onError: alFallar })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Recibo y sucursales</h1>
      <p className="text-gray-500 mb-4">Cómo sale impreso el recibo de sueldo de esta empresa.</p>
      {msg && <div className="mb-4"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Logo</h2>
          <div className="h-24 flex items-center justify-center border border-dashed border-gray-300 rounded-lg mb-3 bg-gray-50">
            {logoUrl ? <img src={logoUrl} alt="Logo de la empresa" className="max-h-20 max-w-full" /> : <span className="text-sm text-gray-400">Sin logo</span>}
          </div>
          {puedeModificar && (
            <div className="flex gap-2">
              <input ref={archivo} type="file" accept="image/png,image/jpeg" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setMsg(null); subir.mutate(f) } e.target.value = '' }} />
              <BotonSecundario onClick={() => archivo.current?.click()} disabled={subir.isPending} className="inline-flex items-center gap-1.5"><Upload size={14} /> {cfg?.tieneLogo ? 'Cambiar' : 'Subir logo'}</BotonSecundario>
              {cfg?.tieneLogo && <BotonSecundario onClick={() => quitar.mutate()} disabled={quitar.isPending} className="inline-flex items-center gap-1.5 text-red-600"><Trash2 size={14} /> Quitar</BotonSecundario>}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">PNG o JPG de hasta 1 MB.</p>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Formato de impresión</h2>
          <div className="space-y-2">
            {[{ v: 'DOBLE', t: 'Original y duplicado en la misma hoja A4', d: 'Ahorra papel. Si el recibo tiene más de 20 renglones sale uno por hoja.' },
              { v: 'SIMPLE', t: 'Un recibo por hoja', d: 'El original en una hoja y el duplicado en otra.' }].map((o) => (
              <label key={o.v} className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="radio" name="formato" className="mt-1" checked={cfg?.formato === o.v} disabled={!puedeModificar || formato.isPending}
                  onChange={() => { setMsg(null); formato.mutate(o.v) }} />
                <span><span className="font-medium text-gray-700">{o.t}</span><br /><span className="text-xs text-gray-400">{o.d}</span></span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-700">Sucursales</h2>
        {puedeModificar && <BotonPrimario onClick={() => setEdit('nueva')} className="inline-flex items-center gap-1.5"><Plus size={16} /> Nueva sucursal</BotonPrimario>}
      </div>
      <p className="text-xs text-gray-500 mb-2">Se asignan a cada empleado, y el recibo muestra la dirección de su sucursal.</p>
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 font-medium">Código</th><th className="px-4 py-2 font-medium">Nombre</th><th className="px-4 py-2 font-medium">Domicilio</th><th className="px-4 py-2" />
          </tr></thead>
          <tbody>
            {sucursales?.map((s) => (
              <tr key={s.idSucursal} className={`border-b border-gray-50 last:border-0 ${!s.activo ? 'text-gray-400' : ''}`}>
                <td className="px-4 py-2 font-mono text-xs">{s.codigo}</td>
                <td className="px-4 py-2">{s.nombre}{!s.activo && <span className="ml-2 text-xs">(de baja)</span>}</td>
                <td className="px-4 py-2">{[s.domicilio, s.localidad, s.provincia].filter(Boolean).join(', ')}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {puedeModificar && <>
                    <button title="Modificar" onClick={() => setEdit(s)} className="text-gray-500 hover:text-blue-700 mr-2"><Pencil size={14} /></button>
                    {s.activo
                      ? <button title="Dar de baja" onClick={() => { preguntar(`¿Dar de baja la sucursal ${s.nombre}?`, () => baja.mutate(s.idSucursal), { titulo: 'Dar de baja', boton: 'Dar de baja', peligro: true })}} className="text-red-500"><Power size={14} /></button>
                      : <button title="Reactivar" onClick={() => reactivar.mutate(s.idSucursal)} className="text-green-600"><RotateCcw size={14} /></button>}
                  </>}
                </td>
              </tr>
            ))}
            {sucursales?.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Todavía no hay sucursales: los recibos usan la dirección de la empresa.</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <FormSucursal actual={edit === 'nueva' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}
