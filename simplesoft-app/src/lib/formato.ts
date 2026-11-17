const dinero = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
const numero = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

/** $ 1.234,56 */
export const formatoDinero = (v: number) => dinero.format(v)

/** 1.234,56 (para unidades, hasta 4 decimales) */
export const formatoNumero = (v: number) => numero.format(v)
