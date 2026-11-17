import { useConfigStore, type Densidad } from '../store/configStore'

/** Tamaño de letra base (px) de cada nivel. El normal es el 16 px de siempre. */
export const PX_POR_DENSIDAD: Record<Exclude<Densidad, 'auto'>, number> = {
  normal: 16,
  compacta: 14,
  'muy-compacta': 12.5,
}

/** En 'auto': las pantallas de hasta 1440 px de ancho (las de 1366×768) usan la compacta. */
const ANCHO_MAX_COMPACTA = 1440

export function densidadEfectiva(d: Densidad, anchoVentana: number): Exclude<Densidad, 'auto'> {
  if (d !== 'auto') return d
  return anchoVentana <= ANCHO_MAX_COMPACTA ? 'compacta' : 'normal'
}

function aplicar() {
  const { densidad } = useConfigStore.getState()
  const efectiva = densidadEfectiva(densidad, window.screen.width || window.innerWidth)
  document.documentElement.style.fontSize = `${PX_POR_DENSIDAD[efectiva]}px`
}

/**
 * Aplica el tamaño elegido al abrir la app y cada vez que cambia la configuración. En 'auto' se mide el ancho de
 * la pantalla física, no el de la ventana: así el zoom del navegador no cambia el criterio.
 */
export function iniciarDensidad() {
  aplicar()
  useConfigStore.subscribe(aplicar)
}
