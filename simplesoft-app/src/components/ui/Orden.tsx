import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

export type Direccion = 'asc' | 'desc'

/** Qué valor de cada fila se compara al ordenar por una columna (texto, número o fecha como número; null = vacío, va siempre al final). */
export type Accesor<T> = (fila: T) => string | number | null | undefined

export interface Orden<T> {
  /** La lista completa ordenada (se pagina después, para que el orden valga para todas las páginas). */
  lista: T[] | undefined
  col: string
  dir: Direccion
  /** Ordena por esa columna; si ya estaba, invierte el sentido. */
  alternar: (col: string) => void
}

/** Compara dos valores: los vacíos siempre al final; los textos "naturalmente" (legajo 2 antes que 10), sin distinguir mayúsculas ni acentos. */
function comparar(a: string | number | null | undefined, b: string | number | null | undefined, dir: Direccion): number {
  const vacioA = a === null || a === undefined || a === '', vacioB = b === null || b === undefined || b === ''
  if (vacioA || vacioB) return vacioA === vacioB ? 0 : vacioA ? 1 : -1
  const r = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? r : -r
}

/**
 * Ordena una lista en el cliente por la columna elegida. `accesores` (definido fuera del componente) dice qué se compara en cada columna;
 * `desempate` es la columna que decide cuando dos filas empatan (por ejemplo, el legajo).
 */
export function useOrden<T>(lista: T[] | undefined, accesores: Record<string, Accesor<T>>, inicial: { col: string; dir: Direccion }, desempate?: string): Orden<T> {
  const [estado, setEstado] = useState(inicial)
  const ordenada = useMemo(() => {
    const acc = accesores[estado.col]
    if (!lista || !acc) return lista
    const des = desempate ? accesores[desempate] : undefined
    return [...lista].sort((x, y) => comparar(acc(x), acc(y), estado.dir) || (des ? comparar(des(x), des(y), 'asc') : 0))
  }, [lista, accesores, estado, desempate])
  const alternar = (col: string) => setEstado((e) => (e.col === col ? { col, dir: e.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }))
  return { lista: ordenada, col: estado.col, dir: estado.dir, alternar }
}

/** Encabezado de columna que se puede tocar para ordenar; muestra la flecha de la columna activa. */
export function ThOrden<T>({ col, titulo, orden, onOrdenar, className = '' }: { col: string; titulo: string; orden: Orden<T>; onOrdenar?: () => void; className?: string }) {
  const activa = orden.col === col
  const Icono = !activa ? ChevronsUpDown : orden.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={`px-4 py-2 font-medium ${className}`} aria-sort={activa ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => { orden.alternar(col); onOrdenar?.() }} title={`Ordenar por ${titulo.toLowerCase()}`}
        className={`inline-flex items-center gap-1 hover:text-gray-800 ${activa ? 'text-gray-800' : ''}`}>
        {titulo}<Icono size={12} className={activa ? 'text-blue-600' : 'text-gray-300'} />
      </button>
    </th>
  )
}
