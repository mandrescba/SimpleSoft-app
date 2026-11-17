import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Modal from './Modal'
import { BotonPrimario, Mensaje } from './Campos'
import type { ClaveTemporal } from '../../types/sistema'

/** Muestra UNA vez la clave temporal de un usuario nuevo o reiniciado. */
export default function ClaveTemporalModal({ datos, onClose }: { datos: ClaveTemporal; onClose: () => void }) {
  const [copiada, setCopiada] = useState(false)
  const copiar = async () => {
    try { await navigator.clipboard.writeText(datos.claveTemporal); setCopiada(true) } catch { /* sin portapapeles: queda para copiar a mano */ }
  }
  return (
    <Modal titulo="Clave temporal" onClose={onClose}>
      <p className="text-sm text-gray-600 mb-3">Usuario <strong>{datos.usuario}</strong>. Pasale esta clave: tendrá que cambiarla al ingresar.</p>
      <div className="flex items-center gap-2 mb-4">
        <code className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-lg tracking-wider select-all text-center">{datos.claveTemporal}</code>
        <button onClick={copiar} className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50" title="Copiar">{copiada ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}</button>
      </div>
      <Mensaje tipo="aviso">Esta clave se muestra una sola vez. Si se pierde, hay que reiniciarla de nuevo.</Mensaje>
      <div className="flex justify-end mt-4"><BotonPrimario onClick={onClose}>Entendido</BotonPrimario></div>
    </Modal>
  )
}
