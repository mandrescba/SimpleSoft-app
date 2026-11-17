import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/** Ventana modal simple: se cierra con la X o tocando afuera. */
export default function Modal({ titulo, onClose, children, ancho = 'max-w-lg' }: { titulo: string; onClose: () => void; children: ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`bg-white rounded-2xl shadow-xl w-full ${ancho} my-8`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{titulo}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
