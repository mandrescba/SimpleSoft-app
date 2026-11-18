import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { login } from '../../api/auth'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  usuario: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setSesion = useAuthStore((s) => s.setSesion)
  const [error, setError] = useState<string | null>(null)

  // Si el ingreso se muestra porque venció la sesión, se avisa una sola vez
  const [sessionExpired] = useState(() => useAuthStore.getState().sessionExpired)
  useEffect(() => {
    if (sessionExpired) useAuthStore.getState().clearSessionExpired()
  }, [sessionExpired])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const sesion = await login(data)
      setSesion(sesion)
      // con una sola empresa el token ya la trae; con varias hay que elegir
      navigate(sesion.debeCambiarClave ? '/cambiar-clave' : sesion.empresaActual ? '/' : '/empresa', { replace: true })
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo ingresar. Probá de nuevo.'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center justify-center mb-4">
          <h1 className="sr-only">SimpleSoft</h1>
          <img src={`${import.meta.env.BASE_URL}logo-completo.svg`} alt="SimpleSoft" className="h-16 w-auto" />
        </div>
        <p className="text-sm text-gray-500 text-center mb-6">Sistema Contable</p>

        {sessionExpired && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Tu sesión expiró. Iniciá sesión de nuevo.
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input {...register('usuario')} autoComplete="username"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.usuario && <p className="text-xs text-red-500 mt-1">{errors.usuario.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input {...register('password')} type="password" autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={isSubmitting}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
