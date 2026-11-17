/**
 * Barra de pestañas (misma estética que la ficha del empleado). Solo dibuja la barra: quien la usa muestra el contenido de la pestaña activa.
 * Cada pestaña puede llevar un aviso (punto rojo), por ejemplo cuando falta un dato obligatorio en ella.
 */
export interface Pestania<T extends string> { clave: T; titulo: string; aviso?: boolean }

export default function Pestanias<T extends string>({ items, activa, onChange }: { items: Pestania<T>[]; activa: T; onChange: (clave: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-gray-200 overflow-x-auto">
      {items.map((t) => (
        <button key={t.clave} type="button" role="tab" aria-selected={activa === t.clave} onClick={() => onChange(t.clave)}
          className={`relative px-4 py-2 text-sm font-medium -mb-px border-b-2 whitespace-nowrap transition-colors ${activa === t.clave ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          {t.titulo}
          {t.aviso && <span aria-label="Falta completar" className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
        </button>
      ))}
    </div>
  )
}
