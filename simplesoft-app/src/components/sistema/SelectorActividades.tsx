import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus, Search, Star } from 'lucide-react'
import { buscarActividades, crearActividad, type Actividad } from '../../api/clientes'
import { mensajeDeError } from '../../api/axios'
import { inputCls } from '../ui/Campos'

/** Busca una actividad en el catálogo CLAE; si no está, el superadministrador puede crearla en el momento (el catálogo es de todos). */
function BuscadorActividad({ yaElegidas, onElegir, permitirCrear }: { yaElegidas: number[]; onElegir: (a: Actividad) => void; permitirCrear: boolean }) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t) }, [q])
  const { data } = useQuery({ queryKey: ['sistema', 'actividades', debounced], queryFn: () => buscarActividades(debounced), enabled: debounced.length >= 2 })
  const crear = useMutation({
    mutationFn: () => crearActividad(q.trim(), codigo.trim() || null),
    onSuccess: (a) => { onElegir(a); setQ(''); setCodigo(''); setError(null) },
    onError: (e) => setError(mensajeDeError(e)),
  })
  const libres = (data ?? []).filter((a) => !yaElegidas.includes(a.idActividad))
  const hayIgual = (data ?? []).some((a) => a.descripcion.toLowerCase() === q.trim().toLowerCase())
  return (
    <div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-3 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar entre las 966 actividades: código o palabras del nombre…" className={`${inputCls} pl-8`} />
      </div>
      {debounced.length >= 2 && q.trim().length >= 2 && (
        <div className="mt-1 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
          {libres.map((a) => (
            <button key={a.idActividad} type="button" onClick={() => { onElegir(a); setQ('') }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex gap-2">
              <span className="font-mono text-xs text-gray-500 w-14 shrink-0">{a.codigo ?? 'manual'}</span><span>{a.descripcion}</span>
            </button>
          ))}
          {libres.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No hay coincidencias en el catálogo.</p>}
          {(data?.length ?? 0) >= 30 && <p className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">Se muestran las primeras 30: escribí más palabras para acotar.</p>}
          {permitirCrear && !hayIgual && (
            <div className="border-t border-gray-100 p-2 flex flex-wrap items-center gap-2 bg-gray-50">
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={10} placeholder="Código CLAE (opcional)" className={`${inputCls} !w-44 !py-1`} />
              <button type="button" onClick={() => crear.mutate()} disabled={crear.isPending} className="text-sm text-blue-700 hover:underline inline-flex items-center gap-1"><Plus size={14} /> Crear «{q.trim()}»</button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

/** Las actividades de una empresa (varias, una principal marcada con la estrella) y el buscador para agregar. */
export default function SelectorActividades({ acts, setActs, ppal, setPpal, permitirCrear = false }: {
  acts: Actividad[]; setActs: (a: Actividad[]) => void; ppal: number | null; setPpal: (id: number | null) => void; permitirCrear?: boolean
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {acts.map((a) => (
          <span key={a.idActividad} className={`inline-flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1 ${ppal === a.idActividad ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-300 text-gray-700'}`}>
            <button type="button" title="Marcar como principal" onClick={() => setPpal(a.idActividad)}><Star size={12} className={ppal === a.idActividad ? 'fill-blue-500 text-blue-500' : 'text-gray-400'} /></button>
            {a.codigo && <span className="font-mono">{a.codigo}</span>}{a.descripcion}
            <button type="button" title="Quitar" onClick={() => { setActs(acts.filter((x) => x.idActividad !== a.idActividad)); if (ppal === a.idActividad) setPpal(null) }} className="text-gray-400 hover:text-red-500">×</button>
          </span>
        ))}
        {acts.length === 0 && <span className="text-xs text-gray-400">Sin actividades.</span>}
      </div>
      <BuscadorActividad yaElegidas={acts.map((a) => a.idActividad)} onElegir={(a) => { setActs([...acts, a]); if (!ppal) setPpal(a.idActividad) }} permitirCrear={permitirCrear} />
    </div>
  )
}
