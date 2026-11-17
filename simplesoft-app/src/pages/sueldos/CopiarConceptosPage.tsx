import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Copy, XCircle } from 'lucide-react'
import { copiarConceptos, getDestinosCopia, vistaCopia, type AccionCopia, type CopiaDestino, type ItemCopia } from '../../api/copiaConceptos'
import { getConceptos } from '../../api/sueldos'
import { mensajeDeError } from '../../api/axios'
import { BotonPrimario, BotonSecundario, Mensaje, inputCls } from '../../components/ui/Campos'
import { preguntar } from '../../components/ui/Confirmar'

const TIPO: Record<ItemCopia['tipo'], string> = { CONCEPTO: 'Concepto', AUXILIAR: 'Fórmula auxiliar', TABLA: 'Tabla', TIPO_NOVEDAD: 'Tipo de novedad' }
const ACCION: Record<AccionCopia, { texto: string; clase: string }> = {
  Crear: { texto: 'Se crea', clase: 'text-green-700' }, Actualizar: { texto: 'Se actualiza', clase: 'text-blue-700' },
  SinCambios: { texto: 'Sin cambios', clase: 'text-gray-400' }, Omitir: { texto: 'No se copia', clase: 'text-amber-700' },
}

/** Resultado por empresa de destino (la vista previa o lo que pasó al copiar). */
function Destino({ d, copiado }: { d: CopiaDestino; copiado: boolean }) {
  const items = d.plan?.items ?? []
  const cuenta = (a: AccionCopia) => items.filter((i) => i.accion === a).length
  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-sm">{d.empresa}</h3>
        {d.plan && <span className="text-xs text-gray-500">{cuenta('Crear')} por crear · {cuenta('Actualizar')} por actualizar · {cuenta('SinCambios')} sin cambios{cuenta('Omitir') > 0 && ` · ${cuenta('Omitir')} no se copian`}</span>}
      </div>
      {d.error && <div className="p-3"><Mensaje tipo="error">{d.error}</Mensaje></div>}
      {d.plan?.avisos.map((a) => <div key={a} className="px-4 pt-3"><Mensaje tipo="aviso">{a}</Mensaje></div>)}
      {items.length > 0 && (
        <table className="w-full text-sm mt-2">
          <tbody>
            {items.map((i) => (
              <tr key={`${i.tipo}|${i.codigo}`} className="border-t border-gray-50 first:border-0">
                <td className="px-4 py-1.5 text-xs text-gray-400 w-32">{TIPO[i.tipo]}</td>
                <td className="px-4 py-1.5"><span className="font-mono text-xs mr-2">{i.codigo}</span>{i.descripcion}</td>
                <td className="px-4 py-1.5 text-right whitespace-nowrap">
                  {copiado && i.resultado
                    ? (i.resultado.startsWith('Error') ? <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={13} /> {i.resultado}</span>
                      : i.accion === 'Omitir' ? <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle size={13} /> {i.resultado}</span>
                      : <span className={`inline-flex items-center gap-1 ${i.resultado === 'Sin cambios' ? 'text-gray-400' : 'text-green-700'}`}>{i.resultado !== 'Sin cambios' && <CheckCircle2 size={13} />} {i.resultado}</span>)
                    : <span className={ACCION[i.accion].clase} title={i.resultado ?? undefined}>{ACCION[i.accion].texto}{i.accion === 'Omitir' && i.resultado ? ` (${i.resultado})` : ''}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/** Copia de conceptos a otras empresas: elegir conceptos y empresas, ver qué pasaría y copiar. */
export default function CopiarConceptosPage() {
  const { data: conceptos } = useQuery({ queryKey: ['sueldos', 'conceptos'], queryFn: getConceptos })
  const { data: destinos, isError, error } = useQuery({ queryKey: ['sueldos', 'destinos-copia'], queryFn: getDestinosCopia })
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [empresas, setEmpresas] = useState<Set<number>>(new Set())
  const [dependencias, setDependencias] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [resultado, setResultado] = useState<{ copiado: boolean; datos: CopiaDestino[] } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const visibles = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    return (conceptos ?? []).filter((c) => !f || c.codigo.toLowerCase().includes(f) || c.descripcion.toLowerCase().includes(f))
  }, [conceptos, filtro])
  const pedido = () => ({ codigos: [...elegidos], destinos: [...empresas], incluirDependencias: dependencias })
  const listo = elegidos.size > 0 && empresas.size > 0

  const vista = useMutation({ mutationFn: () => vistaCopia(pedido()), onSuccess: (datos) => { setResultado({ copiado: false, datos }); setMsg(null) }, onError: (e) => setMsg(mensajeDeError(e)) })
  const copiar = useMutation({ mutationFn: () => copiarConceptos(pedido()), onSuccess: (datos) => { setResultado({ copiado: true, datos }); setMsg(null) }, onError: (e) => setMsg(mensajeDeError(e)) })
  const alternar = <T,>(s: Set<T>, v: T) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n }
  const cambio = () => setResultado(null)

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800">Copiar conceptos a otras empresas</h1>
      <p className="text-gray-500 mb-4">Llevá conceptos de esta empresa a otras: si el concepto ya existe en la otra se actualiza, y si no, se crea. Sirve para mantener la configuración que armás en la empresa base.</p>
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}

      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-2">1. Conceptos a copiar <span className="font-normal text-gray-500">({elegidos.size} elegidos)</span></h2>
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por código o descripción" className={`${inputCls} mb-2`} />
          <div className="flex gap-3 text-xs mb-2">
            <button type="button" className="text-blue-700 hover:underline" onClick={() => { setElegidos(new Set([...elegidos, ...visibles.map((c) => c.codigo)])); cambio() }}>Marcar los que se ven</button>
            <button type="button" className="text-blue-700 hover:underline" onClick={() => { setElegidos(new Set()); cambio() }}>Quitar todos</button>
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {visibles.map((c) => (
              <li key={c.codigo}>
                <label className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50 cursor-pointer">
                  <input type="checkbox" checked={elegidos.has(c.codigo)} onChange={() => { setElegidos(alternar(elegidos, c.codigo)); cambio() }} />
                  <span className="font-mono text-xs text-gray-400 w-12">{c.codigo}</span><span className={c.activo ? '' : 'text-gray-400'}>{c.descripcion}</span>
                </label>
              </li>
            ))}
            {visibles.length === 0 && <li className="px-3 py-4 text-sm text-gray-400 text-center">No hay conceptos</li>}
          </ul>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-2">2. Empresas de destino <span className="font-normal text-gray-500">({empresas.size} elegidas)</span></h2>
          {destinos && destinos.length === 0 && <p className="text-sm text-gray-500">No tenés permiso para modificar Sueldos en otras empresas.</p>}
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg max-h-56 overflow-y-auto">
            {destinos?.map((d) => (
              <li key={d.idEmpresa}>
                <label className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50 cursor-pointer">
                  <input type="checkbox" checked={empresas.has(d.idEmpresa)} onChange={() => { setEmpresas(alternar(empresas, d.idEmpresa)); cambio() }} />
                  <span className="font-mono text-xs text-gray-400">{d.codigo}</span>{d.razonSocial}
                </label>
              </li>
            ))}
          </ul>
          <label className="inline-flex items-start gap-2 text-sm text-gray-700 mt-4">
            <input type="checkbox" checked={dependencias} onChange={(e) => { setDependencias(e.target.checked); cambio() }} className="mt-1" />
            <span>Copiar también lo que usan sus fórmulas<span className="block text-xs text-gray-500">Fórmulas auxiliares, tablas y tipos de novedad. Sin esto, la fórmula del concepto puede no funcionar en la otra empresa.</span></span>
          </label>
        </section>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <BotonSecundario onClick={() => { setMsg(null); vista.mutate() }} disabled={!listo || vista.isPending}>{vista.isPending ? 'Calculando…' : '3. Ver qué pasaría'}</BotonSecundario>
        {resultado && !resultado.copiado && (
          <BotonPrimario disabled={copiar.isPending} className="inline-flex items-center gap-1.5"
            onClick={() => { preguntar(`Se van a copiar ${elegidos.size} conceptos a ${empresas.size} empresas. Los que ya existan se actualizan. ¿Seguimos?`, () => { setMsg(null); copiar.mutate() }, { titulo: 'Copiar conceptos', boton: 'Copiar' }) }}>
            <Copy size={15} /> {copiar.isPending ? 'Copiando…' : 'Copiar ahora'}
          </BotonPrimario>
        )}
      </div>
      {msg && <div className="mb-4"><Mensaje tipo="error">{msg}</Mensaje></div>}
      {resultado?.copiado && <div className="mb-4"><Mensaje tipo="ok">Copia terminada. Revisá el detalle de cada empresa.</Mensaje></div>}
      {resultado?.datos.map((d) => <Destino key={d.idEmpresa} d={d} copiado={resultado.copiado} />)}
    </div>
  )
}
