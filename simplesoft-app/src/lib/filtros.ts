/**
 * Filtros de listados con los patrones del manual de Sueldos. Varios patrones separados por coma se suman (cualquiera que coincida).
 *
 *   Período:  01/2021*            → 01/2021, 01/2021 1Q, 01/2021 2Q (el * reemplaza cualquier texto)
 *             *2021               → 01/2021, 02/2021 ... 12/2021
 *             01/2021..03/2021    → enero, febrero y marzo de 2021 (con o sin texto al final: 01/2021 1Q entra)
 *             01/2021             → solo ese texto exacto
 *   Fecha:    2013                → todo el año 2013
 *             6/2013              → el mes 6 de 2013
 *             2011..2013          → de 2011 a 2013
 *             1/2013..6/2013      → el primer semestre
 *             1/2013..3/2013,6/2013..9/2013 → dos tramos
 */

const sinEspacios = (s: string) => s.trim()

/** Mes absoluto (año*12+mes-1) de un texto MM/AAAA o M/AAAA al comienzo; null si no empieza así. */
function mesDe(texto: string): number | null {
  const m = /^\s*(\d{1,2})\/(\d{4})/.exec(texto)
  if (!m) return null
  const mes = Number(m[1])
  return mes >= 1 && mes <= 12 ? Number(m[2]) * 12 + mes - 1 : null
}

/** ¿El texto del período coincide con el filtro? Un filtro vacío deja pasar todo. */
export function coincidePeriodo(periodo: string, filtro: string): boolean {
  const patrones = filtro.split(',').map(sinEspacios).filter(Boolean)
  if (patrones.length === 0) return true
  return patrones.some((p) => {
    if (p.includes('..')) {
      const [a, b] = p.split('..').map(sinEspacios)
      const desde = mesDe(a), hasta = mesDe(b), actual = mesDe(periodo)
      return desde !== null && hasta !== null && actual !== null && actual >= Math.min(desde, hasta) && actual <= Math.max(desde, hasta)
    }
    if (p.includes('*')) {
      const rx = new RegExp('^' + p.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i')
      return rx.test(periodo.trim())
    }
    return periodo.trim().toLowerCase() === p.toLowerCase()
  })
}

/** Extremos (en meses absolutos, inclusive) de un tramo de fecha: AAAA, M/AAAA o MM/AAAA. */
function tramo(t: string): { desde: number; hasta: number } | null {
  const s = t.trim()
  let m = /^(\d{4})$/.exec(s)
  if (m) return { desde: Number(m[1]) * 12, hasta: Number(m[1]) * 12 + 11 }
  m = /^(\d{1,2})\/(\d{4})$/.exec(s)
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) { const v = Number(m[2]) * 12 + Number(m[1]) - 1; return { desde: v, hasta: v } }
  return null
}

/** ¿La fecha (ISO aaaa-mm-dd o con hora) cae en alguno de los tramos del filtro? Un filtro vacío deja pasar todo; un filtro mal escrito no deja pasar nada. */
export function coincideFecha(fechaIso: string | null, filtro: string): boolean {
  const patrones = filtro.split(',').map(sinEspacios).filter(Boolean)
  if (patrones.length === 0) return true
  if (!fechaIso) return false
  const m = /^(\d{4})-(\d{2})/.exec(fechaIso)
  if (!m) return false
  const actual = Number(m[1]) * 12 + Number(m[2]) - 1
  return patrones.some((p) => {
    const [a, b] = p.includes('..') ? p.split('..') : [p, p]
    const ta = tramo(a), tb = tramo(b)
    return ta !== null && tb !== null && actual >= Math.min(ta.desde, tb.desde) && actual <= Math.max(ta.hasta, tb.hasta)
  })
}

/** Texto de ayuda de los filtros de período. */
export const AYUDA_FILTRO_PERIODO = '01/2026*  ·  *2026  ·  01/2026..03/2026  ·  varios separados por coma'
/** Texto de ayuda de los filtros de fecha. */
export const AYUDA_FILTRO_FECHA = '2026  ·  6/2026  ·  2025..2026  ·  1/2026..6/2026'
