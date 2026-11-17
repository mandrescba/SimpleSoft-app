import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, XCircle } from 'lucide-react'
import { calcularRecibo } from '../../api/sueldos'
import { mensajeDeError } from '../../api/axios'
import { formatoDinero, formatoNumero } from '../../lib/formato'
import type { LineaRecibo, ReciboCalculado } from '../../types/sueldos'
import { activos, useCatalogos } from '../../hooks/useCatalogos'

const schema = z.object({
  legajo: z.string().min(1, 'Requerido'),
  periodo: z.string().regex(/^\d{2}\/\d{4}$/, 'Formato MM/AAAA, por ejemplo 01/2026'),
})
type FormData = z.infer<typeof schema>

function Total({ titulo, valor, destacado }: { titulo: string; valor: number; destacado?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${destacado ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-gray-200'}`}>
      <div className={`text-xs ${destacado ? 'text-blue-100' : 'text-gray-500'}`}>{titulo}</div>
      <div className="text-lg font-semibold tabular-nums">{formatoDinero(valor)}</div>
    </div>
  )
}

function TablaLineas({ titulo, lineas }: { titulo: string; lineas: LineaRecibo[] }) {
  if (lineas.length === 0) return null
  return (
    <section className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{titulo}</h3>
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Concepto</th>
              <th className="px-4 py-2 font-medium text-right">Unidad</th>
              <th className="px-4 py-2 font-medium text-right">Importe</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.codigo} className={`border-b border-gray-50 last:border-0 ${!l.aplica ? 'text-gray-400' : ''}`}>
                <td className="px-4 py-2"><span className="font-mono text-xs text-gray-400 mr-2">{l.codigo}</span>{l.descripcion}</td>
                <td className="px-4 py-2 text-right tabular-nums">{l.unidad ? formatoNumero(l.unidad) : ''}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatoDinero(l.importe)}</td>
                <td className="px-4 py-2">
                  {l.error && <span className="inline-flex items-center gap-1 text-xs text-red-600" title={l.mensaje ?? ''}><XCircle size={13} /> Error</span>}
                  {!l.error && l.advertencia && <span className="inline-flex items-center gap-1 text-xs text-amber-600" title={l.mensaje ?? ''}><AlertTriangle size={13} /> Se bloquea con otros</span>}
                  {!l.error && !l.advertencia && !l.aplica && <span className="text-xs">No aplica</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Calcula (sin guardar) el recibo de un legajo en un período con las fórmulas de la empresa. */
export default function LiquidarReciboPage() {
  const cat = useCatalogos()
  const [verAuxiliares, setVerAuxiliares] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { legajo: '', periodo: '' },
  })

  const calcular = useMutation({
    mutationFn: (d: FormData) => calcularRecibo(d.legajo.trim(), d.periodo),
  })
  const recibo: ReciboCalculado | undefined = calcular.data

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Liquidar recibo</h1>
      <p className="text-gray-500 mb-6">El cálculo no se guarda: sirve para ver qué da el recibo con las fórmulas actuales.</p>

      <form onSubmit={handleSubmit((d) => calcular.mutate(d))} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-start gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Legajo</label>
          <input {...register('legajo')} className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.legajo && <p className="text-xs text-red-500 mt-1">{errors.legajo.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
          <input {...register('periodo')} placeholder="01/2026" className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.periodo && <p className="text-xs text-red-500 mt-1 max-w-48">{errors.periodo.message}</p>}
        </div>
        <button type="submit" disabled={calcular.isPending}
          className="mt-6 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
          {calcular.isPending ? 'Calculando…' : 'Calcular'}
        </button>
      </form>

      {calcular.isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-6">
          {mensajeDeError(calcular.error, 'No se pudo calcular el recibo.')}
        </p>
      )}

      {recibo && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Legajo {recibo.legajo} · {recibo.periodo}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <Total titulo="Remunerativo" valor={recibo.remunerativo} />
            <Total titulo="No remunerativo" valor={recibo.noRemunerativo} />
            <Total titulo="Descuentos" valor={recibo.descuento} />
            <Total titulo="Sueldo neto" valor={recibo.sueldoNeto} destacado />
            <Total titulo="Contribuciones" valor={recibo.contribucion} />
            <Total titulo="Costo laboral" valor={recibo.costoLaboral} />
          </div>

          {activos(cat.columnasConcepto).map((c) => {
            if (c.calculoInterno && !verAuxiliares) return null
            return <TablaLineas key={c.codigo} titulo={c.tituloGrupo} lineas={recibo.lineas.filter((l) => l.columna === c.codigo)} />
          })}

          {recibo.lineas.some((l) => cat.esCalculoInterno(l.columna)) && (
            <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={verAuxiliares} onChange={(e) => setVerAuxiliares(e.target.checked)} />
              Mostrar los conceptos auxiliares ({recibo.lineas.filter((l) => cat.esCalculoInterno(l.columna)).length})
            </label>
          )}
        </>
      )}
    </div>
  )
}
