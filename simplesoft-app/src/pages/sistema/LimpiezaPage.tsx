import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Trash2 } from 'lucide-react'
import { borrarDatos, revisarLimpieza, type TablaLimpieza } from '../../api/limpieza'
import { getEmpresas } from '../../api/sistema'
import { mensajeDeError } from '../../api/axios'
import { BotonSecundario, Mensaje, inputCls } from '../../components/ui/Campos'
import { preguntar } from '../../components/ui/Confirmar'

const GRUPOS: { clave: TablaLimpieza['grupo']; titulo: string; ayuda: string; color: string }[] = [
  { clave: 'MOVIMIENTOS', titulo: 'Movimientos (se borran)', ayuda: 'Liquidaciones, recibos, novedades, ausentismo y registro de actividad.', color: 'text-red-700' },
  { clave: 'PERSONAL', titulo: 'Personal (se borra solo si lo tildás)', ayuda: 'Empleados, sus conceptos, datos de ARCA, historial y familiares.', color: 'text-amber-700' },
  { clave: 'CONSERVADA', titulo: 'Se conservan', ayuda: 'Catálogos, convenios, conceptos, configuración y tablas de sistema (usuarios, empresas, roles). Una tabla nueva queda acá hasta que se la clasifique.', color: 'text-green-700' },
]

/** Solo superadministrador: elige empresas, muestra qué se borraría, arma el SQL y puede borrar. */
export default function LimpiezaPage() {
  const qc = useQueryClient()
  const [elegidas, setElegidas] = useState<number[]>([])
  const [conPersonal, setConPersonal] = useState(false)
  const [darDeBaja, setDarDeBaja] = useState(false)
  const [palabra, setPalabra] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)

  const empresas = useQuery({ queryKey: ['empresas'], queryFn: getEmpresas })
  const pedido = { empresas: elegidas, incluirPersonal: conPersonal }
  const q = useQuery({ queryKey: ['limpieza', elegidas, conPersonal], queryFn: () => revisarLimpieza(pedido), staleTime: 0 })

  const borrar = useMutation({
    mutationFn: () => borrarDatos({ ...pedido, confirmacion: palabra, darDeBaja }),
    onSuccess: (r) => {
      setResultado(`Se borraron ${r.total} filas.${r.dadasDeBaja.length ? ` Empresas dadas de baja: ${r.dadasDeBaja.join(', ')}.` : ''}`)
      setPalabra('')
      void qc.invalidateQueries({ queryKey: ['limpieza'] })
    },
  })

  const alternar = (id: number) => setElegidas((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  const nombres = (empresas.data ?? []).filter((e) => elegidas.includes(e.idEmpresa)).map((e) => e.razonSocial).join(', ')
  const total = (q.data?.tablas ?? []).reduce((s, t) => s + t.filas, 0)
  const bloqueado = (q.data?.avisos ?? []).some((a) => a.includes('apunta a') || a.includes('circulares'))
  const puedeBorrar = elegidas.length > 0 && palabra === 'BORRAR' && !bloqueado && !borrar.isPending

  const copiar = async () => {
    if (!q.data) return
    await navigator.clipboard.writeText(q.data.sql)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const pedirBorrado = () => {
    setResultado(null)
    preguntar(
      `Vas a borrar ${total} filas de movimientos${conPersonal ? ' y de personal' : ''} de: ${nombres}. Esto no se puede deshacer.`,
      () => borrar.mutate(),
      { titulo: 'Borrar datos', boton: 'Borrar', peligro: true },
    )
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Limpieza de datos</h1>
        <p className="text-sm text-gray-500">Elegí las bases (empresas), mirá qué se borraría y copiá el SQL o borrá desde acá. Los catálogos y las tablas de sistema no se tocan.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Bases a limpiar · {elegidas.length} elegidas</h2>
          <div className="text-xs space-x-3">
            <button className="text-blue-700 hover:underline" onClick={() => setElegidas((empresas.data ?? []).map((e) => e.idEmpresa))}>Todas</button>
            <button className="text-blue-700 hover:underline" onClick={() => setElegidas([])}>Ninguna</button>
          </div>
        </div>
        {empresas.isError && <Mensaje tipo="error">{mensajeDeError(empresas.error)}</Mensaje>}
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 max-h-56 overflow-y-auto">
          {(empresas.data ?? []).map((e) => (
            <li key={e.idEmpresa}>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={elegidas.includes(e.idEmpresa)} onChange={() => alternar(e.idEmpresa)} />
                <span className="truncate">{e.razonSocial}</span>
                <span className="text-xs text-gray-400">{e.codigo}{e.tipo !== 'CLIENTE' ? ` · ${e.tipo}` : ''}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={conPersonal} onChange={(e) => setConPersonal(e.target.checked)} />
        Incluir también empleados y sus datos
      </label>

      {q.isError && <Mensaje tipo="error">{mensajeDeError(q.error)}</Mensaje>}

      {q.data && (
        <>
          {q.data.avisos.map((a) => <Mensaje key={a} tipo="aviso">{a}</Mensaje>)}

          <div className="grid md:grid-cols-3 gap-4">
            {GRUPOS.map((g) => {
              const lista = q.data.tablas.filter((t) => t.grupo === g.clave)
              return (
                <div key={g.clave} className="bg-white border border-gray-200 rounded-xl p-4">
                  <h2 className={`text-sm font-semibold ${g.color}`}>{g.titulo} · {lista.length}</h2>
                  <p className="text-xs text-gray-500 mb-2">{g.ayuda}</p>
                  <ul className="text-xs text-gray-700 space-y-0.5 max-h-64 overflow-y-auto">
                    {lista.map((t) => (
                      <li key={t.tabla} className="flex justify-between gap-2">
                        <span className="truncate">{t.tabla}</span>
                        {g.clave !== 'CONSERVADA' && <span className="text-gray-400 shrink-0">{t.filas}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">SQL de borrado (para correr a mano si preferís)</h2>
              <BotonSecundario onClick={copiar}><Copy size={14} className="inline mr-1" />{copiado ? 'Copiado' : 'Copiar'}</BotonSecundario>
            </div>
            <pre className="bg-gray-900 text-gray-100 text-xs rounded-xl p-4 overflow-auto max-h-80">{q.data.sql}</pre>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-red-700">Borrar desde acá</h2>
            <p className="text-xs text-red-700">Borra {total} filas de las bases elegidas, todo en una sola transacción (si algo falla, no se borra nada). Hacé un backup antes.</p>
            <label className="flex items-center gap-2 text-sm text-red-800">
              <input type="checkbox" checked={darDeBaja} onChange={(e) => setDarDeBaja(e.target.checked)} />
              Además, dar de baja las empresas elegidas (se saltean la actual, la MASTER y la DEMO)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input value={palabra} onChange={(e) => setPalabra(e.target.value)} placeholder="Escribí BORRAR" className={`${inputCls} max-w-[12rem]`} />
              <button disabled={!puedeBorrar} onClick={pedirBorrado}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg">
                <Trash2 size={14} className="inline mr-1" />{borrar.isPending ? 'Borrando…' : 'Borrar'}
              </button>
            </div>
            {borrar.isError && <Mensaje tipo="error">{mensajeDeError(borrar.error)}</Mensaje>}
            {resultado && <Mensaje tipo="ok">{resultado}</Mensaje>}
          </div>
        </>
      )}
    </div>
  )
}
