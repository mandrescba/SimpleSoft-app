import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Search } from 'lucide-react'
import { seleccionarEmpresa } from '../../api/auth'
import { getEmpresas } from '../../api/sistema'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { EtiquetaTipo, estiloEntorno } from '../../components/sistema/TipoEmpresa'
import { useCatalogos } from '../../hooks/useCatalogos'
import { inputCls } from '../../components/ui/Campos'

function Dato({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return <div><div className="text-xs text-gray-500">{titulo}</div><div className="text-sm text-gray-800 break-words">{children || <span className="text-gray-300">—</span>}</div></div>
}

/**
 * El usuario elige con qué empresa trabaja; el backend le devuelve un token con el rol y permisos de esa empresa.
 * A la izquierda la lista; al elegir una se ven sus datos a la derecha y recién ahí se entra.
 */
export default function ElegirEmpresaPage() {
  const navigate = useNavigate()
  const cat = useCatalogos()
  const queryClient = useQueryClient()
  const { empresas, empresaActual, nombre, setSesion, logout } = useAuthStore()
  const [elegida, setElegida] = useState<number | null>(empresaActual?.idEmpresa ?? empresas[0]?.idEmpresa ?? null)
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  // los datos completos de la empresa; si no se pueden traer, el panel muestra lo que ya trae la sesión
  const { data: detalles } = useQuery({ queryKey: ['sistema', 'empresas'], queryFn: getEmpresas, enabled: empresas.length > 0 })

  const visibles = useMemo(() => {
    const t = filtro.trim().toLowerCase()
    return t ? empresas.filter((e) => `${e.razonSocial} ${e.codigo}`.toLowerCase().includes(t)) : empresas
  }, [empresas, filtro])
  const sel = empresas.find((e) => e.idEmpresa === elegida) ?? null
  const det = detalles?.find((d) => d.idEmpresa === elegida)
  const tipo = sel?.tipo ?? 'CLIENTE'

  const entrar = async (idEmpresa: number) => {
    setError(null)
    setCargando(idEmpresa)
    try {
      setSesion(await seleccionarEmpresa(idEmpresa))
      queryClient.clear()   // los datos en caché eran de la empresa anterior
      navigate('/', { replace: true })
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo elegir la empresa.'))
      setCargando(null)
    }
  }

  const domicilio = det ? [det.domicilio, det.localidad, det.provincia, det.codigoPostal && `(${det.codigoPostal})`].filter(Boolean).join(', ') : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-4xl">
        <h1 className="text-xl font-bold text-gray-800">Elegí la empresa</h1>
        <p className="text-sm text-gray-500 mt-1 mb-5">Hola {nombre}, ¿con qué empresa vas a trabajar?</p>

        {empresas.length === 0 && (
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-3">
            Tu usuario todavía no tiene empresas asignadas. Pedile acceso al administrador.
          </p>
        )}

        {empresas.length > 0 && (
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6">
            <div>
              {empresas.length > 6 && (
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                  <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar empresa…" className={`${inputCls} pl-8`} />
                </div>
              )}
              <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                {visibles.map((e) => (
                  <button key={e.idEmpresa} onClick={() => setElegida(e.idEmpresa)} onDoubleClick={() => entrar(e.idEmpresa)} disabled={cargando !== null}
                    className={`w-full flex items-center gap-3 text-left border rounded-xl px-4 py-3 transition-colors disabled:opacity-60 ${
                      e.idEmpresa === elegida ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}>
                    <Building2 size={18} className="text-blue-700 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800 truncate">{e.razonSocial}<EtiquetaTipo tipo={e.tipo ?? 'CLIENTE'} /></span>
                      <span className="block text-xs text-gray-500">{e.codigo} · {e.rol}{e.idEmpresa === empresaActual?.idEmpresa && ' · actual'}</span>
                    </span>
                  </button>
                ))}
                {visibles.length === 0 && <p className="text-sm text-gray-400 px-1">Ninguna empresa coincide.</p>}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 flex flex-col">
              {sel ? (
                <>
                  <div className="flex items-start gap-3">
                    <Building2 size={22} className="text-blue-700 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-800 break-words">{sel.razonSocial}</h2>
                      {det?.nombreFantasia && <div className="text-sm text-gray-500">{det.nombreFantasia}</div>}
                    </div>
                  </div>

                  <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${tipo === 'CLIENTE' ? 'border-green-200 bg-green-50' : tipo === 'PRUEBA' ? 'border-yellow-300 bg-yellow-50' : 'border-purple-200 bg-purple-50'}`}>
                    <span className={`font-medium ${estiloEntorno(tipo)}`}>{cat.tipoEmpresa(tipo)?.descripcion ?? tipo}</span>
                    <span className="text-gray-600"> · {cat.tipoEmpresa(tipo)?.detalle}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3 mt-4">
                    <Dato titulo="Código">{sel.codigo}</Dato>
                    <Dato titulo="Tu rol en esta empresa">{sel.rol}</Dato>
                    <Dato titulo="CUIT">{det?.cuit}</Dato>
                    <Dato titulo="Condición frente al IVA">{cat.nombreCondicionIva(det?.condicionIva ?? null)}</Dato>
                    <div className="sm:col-span-2"><Dato titulo="Actividad">{det?.actividad}</Dato></div>
                    <div className="sm:col-span-2"><Dato titulo="Domicilio">{domicilio}</Dato></div>
                    <Dato titulo="Teléfono / celular">{det?.telefono}</Dato>
                    <Dato titulo="Email">{det?.email}</Dato>
                    <Dato titulo="Tipo de empleador">{cat.nombreTipoEmpleador(det?.tipoEmpleador ?? null)}</Dato>
                  </div>

                  <button onClick={() => entrar(sel.idEmpresa)} disabled={cargando !== null}
                    className="mt-6 w-full sm:w-auto sm:self-end bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors">
                    {cargando === sel.idEmpresa ? 'Entrando…' : 'Entrar a esta empresa'}
                  </button>
                </>
              ) : <p className="text-sm text-gray-400">Elegí una empresa de la lista para ver sus datos.</p>}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">{error}</p>}

        <button onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className="mt-5 text-sm text-gray-500 hover:text-red-600 transition-colors">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
