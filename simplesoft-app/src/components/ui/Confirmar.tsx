import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { AlertTriangle, HelpCircle } from 'lucide-react'

/** Cómo se ve la pregunta: título, texto del botón y si la acción es destructiva (botón rojo). */
export interface OpcionesConfirmar { titulo?: string; boton?: string; peligro?: boolean }

interface Pedido extends OpcionesConfirmar { mensaje: string; resolver: (ok: boolean) => void }

const useConfirmarStore = create<{ pedido: Pedido | null }>(() => ({ pedido: null }))

/** Pregunta con una ventana propia (en lugar del confirm del navegador). Devuelve true si el usuario acepta. */
export function confirmar(mensaje: string, opciones: OpcionesConfirmar = {}): Promise<boolean> {
  return new Promise((resolver) => {
    useConfirmarStore.getState().pedido?.resolver(false)   // si había otra abierta, se cancela
    useConfirmarStore.setState({ pedido: { mensaje, ...opciones, resolver } })
  })
}

/** Atajo: pregunta y, si el usuario acepta, ejecuta la acción. */
export function preguntar(mensaje: string, accion: () => void, opciones?: OpcionesConfirmar) {
  void confirmar(mensaje, opciones).then((ok) => { if (ok) accion() })
}

/** Ventana de confirmación. Se monta una sola vez en la raíz de la aplicación. */
export function ConfirmarHost() {
  const pedido = useConfirmarStore((s) => s.pedido)
  const botonOk = useRef<HTMLButtonElement>(null)
  const botonNo = useRef<HTMLButtonElement>(null)

  const responder = (ok: boolean) => {
    const p = useConfirmarStore.getState().pedido
    useConfirmarStore.setState({ pedido: null })
    p?.resolver(ok)
  }

  // el foco arranca en "Cancelar" cuando la acción es destructiva (para no borrar con un Enter apurado) y en el botón principal si no
  useEffect(() => {
    if (!pedido) return
    ;(pedido.peligro ? botonNo : botonOk).current?.focus()
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') responder(false) }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [pedido])

  if (!pedido) return null
  const peligro = !!pedido.peligro
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4 confirmar-fondo"
      onMouseDown={(e) => { if (e.target === e.currentTarget) responder(false) }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirmar-titulo" aria-describedby="confirmar-mensaje"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 confirmar-tarjeta">
        <div className="flex gap-4">
          <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${peligro ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
            {peligro ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
          </div>
          <div className="min-w-0">
            <h2 id="confirmar-titulo" className="text-base font-semibold text-gray-900">{pedido.titulo ?? 'Confirmar'}</h2>
            <p id="confirmar-mensaje" className="mt-1.5 text-sm text-gray-600 whitespace-pre-line break-words">{pedido.mensaje}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={botonNo} type="button" onClick={() => responder(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300">Cancelar</button>
          <button ref={botonOk} type="button" onClick={() => responder(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${peligro ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-400'}`}>
            {pedido.boton ?? 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  )
}
