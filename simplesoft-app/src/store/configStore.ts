import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Opciones que se ofrecen en Configuración para el tamaño de página de las grillas. */
export const OPCIONES_PAGINADO = [10, 20, 50, 100] as const
export const PAGINADO_POR_DEFECTO = 20

/**
 * Tamaño de la interfaz. Todo el diseño está en rem, así que cambiar el tamaño de letra base del documento
 * achica o agranda menús, tablas y modales juntos. 'auto' elige según el ancho de la pantalla física
 * (las de 1366 px necesitan la compacta para que las tablas entren).
 */
export type Densidad = 'auto' | 'normal' | 'compacta' | 'muy-compacta'
export const DENSIDAD_POR_DEFECTO: Densidad = 'auto'

interface ConfigState {
  /** Filas por página en las grillas. Es una preferencia de este navegador, no del servidor. */
  pageSize: number
  densidad: Densidad
  setPageSize: (n: number) => void
  setDensidad: (d: Densidad) => void
  restablecer: () => void
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      pageSize: PAGINADO_POR_DEFECTO,
      densidad: DENSIDAD_POR_DEFECTO,
      setPageSize: (n) => set({ pageSize: (OPCIONES_PAGINADO as readonly number[]).includes(n) ? n : PAGINADO_POR_DEFECTO }),
      setDensidad: (d) => set({ densidad: d }),
      restablecer: () => set({ pageSize: PAGINADO_POR_DEFECTO, densidad: DENSIDAD_POR_DEFECTO }),
    }),
    { name: 'simplesoft-config-storage' },
  ),
)

/** Filas por página que eligió el usuario. */
export const usePageSize = () => useConfigStore((s) => s.pageSize)
