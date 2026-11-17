import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { cambiarClave } from '../../api/auth'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'

/** Cambio de clave. Es obligatorio cuando la clave es inicial o fue reiniciada por un administrador. */
export default function CambiarClavePage() {
  const navigate = useNavigate()
  const { debeCambiarClave, empresaActual, setSesion, logout } = useAuthStore()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (nueva !== repetida) { setError('Las claves nuevas no coinciden.'); return }
    setGuardando(true)
    try {
      setSesion(await cambiarClave(actual, nueva))
      const { empresaActual: emp } = useAuthStore.getState()
      navigate(emp ? '/' : '/empresa', { replace: true })
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cambiar la clave.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center"><KeyRound size={22} className="text-white" /></div>
        </div>
        <h1 className="text-xl font-bold text-gray-800 text-center">Cambiar clave</h1>
        <p className="text-sm text-gray-500 text-center mt-1 mb-5">
          {debeCambiarClave ? 'Tu clave es temporal: tenés que cambiarla para continuar.' : 'Ingresá tu clave actual y la nueva.'}
        </p>

        <form onSubmit={enviar} className="space-y-4">
          <Campo label="Clave actual"><input type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} className={inputCls} /></Campo>
          <Campo label="Clave nueva"><input type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} className={inputCls} /></Campo>
          <Campo label="Repetí la clave nueva"><input type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} className={inputCls} /></Campo>
          <p className="text-xs text-gray-500">Mínimo 10 caracteres, con letras y números, distinta de la actual y sin tu nombre de usuario.</p>
          {error && <Mensaje tipo="error">{error}</Mensaje>}
          <BotonPrimario type="submit" disabled={guardando || !actual || !nueva} className="w-full py-2.5">{guardando ? 'Guardando…' : 'Cambiar clave'}</BotonPrimario>
        </form>

        <div className="mt-4 flex justify-between">
          {!debeCambiarClave && empresaActual
            ? <BotonSecundario onClick={() => navigate(-1)}>Volver</BotonSecundario>
            : <span />}
          <button onClick={() => { logout(); navigate('/login', { replace: true }) }} className="text-sm text-gray-500 hover:text-red-600">Cerrar sesión</button>
        </div>
      </div>
    </div>
  )
}
