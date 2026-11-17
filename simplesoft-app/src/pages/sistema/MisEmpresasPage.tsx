import { EtiquetaTipo } from '../../components/sistema/TipoEmpresa'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Check } from 'lucide-react'
import { seleccionarEmpresa } from '../../api/auth'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { Mensaje } from '../../components/ui/Campos'

/** Las empresas que el usuario administra, con su rol en cada una, y cuál es la actual. Desde acá cambia de empresa. */
export default function MisEmpresasPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { empresas, empresaActual, nombre, usuario, esSuperadmin, setSesion } = useAuthStore()
  const [cargando, setCargando] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const entrar = async (idEmpresa: number) => {
    setError(null)
    setCargando(idEmpresa)
    try {
      setSesion(await seleccionarEmpresa(idEmpresa))
      qc.clear()   // los datos en caché eran de la empresa anterior
      navigate('/', { replace: true })
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo cambiar de empresa.'))
      setCargando(null)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800">Mis empresas</h1>
      <p className="text-gray-500 mb-1">Las empresas con las que trabajás: ves y cargás solo los datos de la empresa actual.</p>
      <p className="text-xs text-gray-400 mb-4">Sesión de <strong>{nombre}</strong> ({usuario}){esSuperadmin && ' · superadministrador'}</p>
      {error && <div className="mb-3"><Mensaje tipo="error">{error}</Mensaje></div>}
      <div className="space-y-2">
        {empresas.map((e) => {
          const actual = e.idEmpresa === empresaActual?.idEmpresa
          return (
            <div key={e.idEmpresa} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${actual ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              <Building2 size={18} className="text-blue-700 shrink-0" />
              <div className="min-w-0 mr-auto">
                <div className="text-sm font-medium text-gray-800 truncate">{e.razonSocial}<EtiquetaTipo tipo={e.tipo ?? 'CLIENTE'} /></div>
                <div className="text-xs text-gray-500">{e.codigo} · {e.rol}</div>
              </div>
              {actual
                ? <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700"><Check size={14} /> Empresa actual</span>
                : <button onClick={() => entrar(e.idEmpresa)} disabled={cargando !== null} className="text-sm font-medium text-blue-700 hover:underline disabled:opacity-50">{cargando === e.idEmpresa ? 'Entrando…' : 'Trabajar con esta'}</button>}
            </div>
          )
        })}
        {empresas.length === 0 && <p className="text-sm text-gray-500">Tu usuario todavía no tiene empresas asignadas.</p>}
      </div>
    </div>
  )
}
