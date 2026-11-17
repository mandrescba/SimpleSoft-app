import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { copiarDatos, getEmpleadosCopia, type CopiaDatos } from '../../api/copiaDatos'
import { getEmpresas } from '../../api/sistema'
import { mensajeDeError } from '../../api/axios'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { preguntar } from '../../components/ui/Confirmar'

/** Solo superadministrador: copia empleados con sus liquidaciones y recibos de una empresa a otra (p. ej. de prueba a la DEMO). */
export default function CopiarDatosPage() {
  const empresas = useQuery({ queryKey: ['sistema', 'empresas'], queryFn: getEmpresas })
  const [origen, setOrigen] = useState<number | ''>('')
  const [destino, setDestino] = useState<number | ''>('')
  const [elegidos, setElegidos] = useState<number[]>([])
  const [res, setRes] = useState<CopiaDatos | null>(null)

  const emps = useQuery({ queryKey: ['copia-empleados', origen], queryFn: () => getEmpleadosCopia(origen as number), enabled: origen !== '' })
  const destinos = (empresas.data ?? []).filter((e) => (e.tipo === 'DEMO' || e.tipo === 'PRUEBA') && e.idEmpresa !== origen)

  const copiar = useMutation({
    mutationFn: (probar: boolean) => copiarDatos({ origen: origen as number, destino: destino as number, empleados: elegidos, probar }),
    onMutate: () => setRes(null),
    onSuccess: setRes,
  })

  const alternar = (id: number) => setElegidos((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  const listo = origen !== '' && destino !== '' && elegidos.length > 0 && !copiar.isPending
  const nombreDestino = destinos.find((e) => e.idEmpresa === destino)?.razonSocial

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Copiar empleados a otra empresa</h1>
        <p className="text-sm text-gray-500">Copia los empleados elegidos con su configuración, liquidaciones y recibos. Es una copia: la empresa de origen no se toca. Convenios, categorías, conceptos y demás configuración se buscan en el destino por su código: tienen que existir allá.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Campo label="Empresa de origen">
          <select className={inputCls} value={origen} onChange={(e) => { setOrigen(e.target.value ? Number(e.target.value) : ''); setElegidos([]); setRes(null); setDestino('') }}>
            <option value="">Elegir…</option>
            {(empresas.data ?? []).map((e) => <option key={e.idEmpresa} value={e.idEmpresa}>{e.codigo} · {e.razonSocial}{e.tipo !== 'CLIENTE' ? ` (${e.tipo})` : ''}</option>)}
          </select>
        </Campo>
        <Campo label="Empresa de destino (solo DEMO o PRUEBA)">
          <select className={inputCls} value={destino} onChange={(e) => { setDestino(e.target.value ? Number(e.target.value) : ''); setRes(null) }}>
            <option value="">Elegir…</option>
            {destinos.map((e) => <option key={e.idEmpresa} value={e.idEmpresa}>{e.codigo} · {e.razonSocial} ({e.tipo})</option>)}
          </select>
        </Campo>
      </div>

      {origen !== '' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Empleados · {elegidos.length} elegidos</h2>
            <div className="text-xs space-x-3">
              <button className="text-blue-700 hover:underline" onClick={() => setElegidos((emps.data ?? []).map((e) => e.idEmpleado))}>Todos</button>
              <button className="text-blue-700 hover:underline" onClick={() => setElegidos([])}>Ninguno</button>
            </div>
          </div>
          {emps.isError && <Mensaje tipo="error">{mensajeDeError(emps.error)}</Mensaje>}
          {emps.data?.length === 0 && <p className="text-sm text-gray-400">Esta empresa no tiene empleados.</p>}
          <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {(emps.data ?? []).map((e) => (
              <li key={e.idEmpleado}>
                <label className="flex items-center gap-2 text-sm text-gray-700 py-1">
                  <input type="checkbox" checked={elegidos.includes(e.idEmpleado)} onChange={() => alternar(e.idEmpleado)} />
                  <span className="w-16 text-gray-500">{e.legajo}</span>
                  <span className="flex-1 truncate">{e.apellido}, {e.nombre}</span>
                  <span className="text-xs text-gray-400">{e.recibos} recibos</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <BotonSecundario disabled={!listo} onClick={() => copiar.mutate(true)}>Probar (no guarda nada)</BotonSecundario>
        <BotonPrimario disabled={!listo}
          onClick={() => preguntar(`Se van a copiar ${elegidos.length} empleados con sus liquidaciones y recibos a ${nombreDestino}.`, () => copiar.mutate(false), { titulo: 'Copiar datos', boton: 'Copiar' })}>
          {copiar.isPending ? 'Procesando…' : 'Copiar'}
        </BotonPrimario>
      </div>

      {copiar.isError && <Mensaje tipo="error">{mensajeDeError(copiar.error)}</Mensaje>}
      {res && (
        <div className="space-y-2">
          <Mensaje tipo={res.probado ? 'aviso' : 'ok'}>{res.probado ? `Prueba correcta: se copiarían ${res.total} filas. No se guardó nada.` : `Listo: se copiaron ${res.total} filas.`}</Mensaje>
          <ul className="text-xs text-gray-700 bg-white border border-gray-200 rounded-xl p-3 space-y-0.5">
            {res.tablas.map((t) => <li key={t.tabla} className="flex justify-between"><span>{t.tabla}</span><span className="text-gray-500">{t.filas}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
