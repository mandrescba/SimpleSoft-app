import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePageSize } from '../../store/configStore'

export interface Paginado<T> {
  filas: T[]
  total: number
  pagina: number
  paginas: number
  desde: number
  hasta: number
  setPagina: (n: number) => void
}

/**
 * Pagina una lista en el cliente con el tamaño de página que el usuario eligió en Configuración.
 * Si la lista cambia (un filtro, un alta) vuelve a la primera página cuando la actual quedó fuera de rango.
 */
export function usePaginado<T>(lista: T[] | undefined): Paginado<T> {
  const size = usePageSize()
  const [pagina, setPagina] = useState(1)
  const total = lista?.length ?? 0
  const paginas = Math.max(1, Math.ceil(total / size))
  useEffect(() => { if (pagina > paginas) setPagina(1) }, [pagina, paginas])
  const actual = Math.min(pagina, paginas)
  const desde = total === 0 ? 0 : (actual - 1) * size + 1
  const hasta = Math.min(total, actual * size)
  return { filas: (lista ?? []).slice((actual - 1) * size, actual * size), total, pagina: actual, paginas, desde, hasta, setPagina }
}

/** Pie de una grilla: "21–40 de 86" y anterior / siguiente. No se muestra si entra todo en una página. */
export function Paginador<T>({ pag }: { pag: Paginado<T> }) {
  if (pag.paginas <= 1) return null
  const boton = 'p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent'
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-gray-100 text-sm text-gray-500">
      <span>{pag.desde}–{pag.hasta} de {pag.total}</span>
      <div className="flex items-center gap-2">
        <button className={boton} disabled={pag.pagina <= 1} onClick={() => pag.setPagina(pag.pagina - 1)} aria-label="Página anterior"><ChevronLeft size={16} /></button>
        <span className="tabular-nums">Página {pag.pagina} de {pag.paginas}</span>
        <button className={boton} disabled={pag.pagina >= pag.paginas} onClick={() => pag.setPagina(pag.pagina + 1)} aria-label="Página siguiente"><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}
