import { Star } from 'lucide-react'
import type { EmpresaDelUsuario } from '../../types/sistema'

/** Nombre del usuario con su email y celular de contacto (enlaces para escribir o llamar). */
export function CeldaContacto({ nombre, email, celular }: { nombre: string; email: string | null; celular: string | null }) {
  return (
    <>
      {nombre}
      <div className="text-xs text-gray-500 flex flex-col">
        {email ? <a href={`mailto:${email}`} className="hover:underline hover:text-blue-700">{email}</a> : <span className="text-gray-300">sin email</span>}
        {celular ? <a href={`tel:${celular.replace(/[^0-9+]/g, '')}`} className="hover:underline hover:text-blue-700 whitespace-nowrap">{celular}</a> : <span className="text-gray-300">sin celular</span>}
      </div>
    </>
  )
}

/** Las empresas del usuario con su rol en cada una; la estrella marca las que creó y se resalta la empresa actual. */
export function CeldaEmpresas({ empresas, actualId }: { empresas: EmpresaDelUsuario[]; actualId?: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {empresas.map((e) => (
        <span key={e.idEmpresa} title={`${e.razonSocial} · ${e.rol}${e.creada ? ' · la creó' : ''}`}
          className={`inline-flex items-center gap-1 text-[11px] rounded-full border px-2 py-0.5 ${e.idEmpresa === actualId ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-600'}`}>
          {e.creada && <Star size={10} className="fill-amber-400 text-amber-400" />}{e.codigo}<span className="text-gray-400">· {e.rol}</span>
        </span>
      ))}
      {empresas.length === 0 && <span className="text-xs text-gray-300">—</span>}
    </div>
  )
}

/** Cuántas empresas creó el usuario frente a su límite (rojo si ya llegó al tope). */
export function CeldaCreadas({ creadas, limite }: { creadas: number; limite: number | null }) {
  if (limite === 0 && creadas === 0) return <span className="text-gray-400">no crea empresas</span>
  return (
    <>
      <span className={limite !== null && creadas >= limite ? 'text-red-600 font-medium' : 'text-gray-700'}>{creadas}{limite !== null ? ` de ${limite}` : ''}</span>
      {limite === null && <div className="text-gray-400">sin límite</div>}
    </>
  )
}

/** Estado de la cuenta: activo, inactivo, bloqueado por intentos fallidos o con la clave por cambiar. */
export function EstadoUsuario({ activo, bloqueadoHasta, debeCambiarClave }: { activo: boolean; bloqueadoHasta: string | null; debeCambiarClave: boolean }) {
  if (!activo) return <span className="text-gray-400">Inactivo</span>
  if (bloqueadoHasta && new Date(bloqueadoHasta) > new Date()) return <span className="text-red-600">Bloqueado</span>
  return debeCambiarClave ? <span className="text-amber-600">Clave por cambiar</span> : <span className="text-green-700">Activo</span>
}
