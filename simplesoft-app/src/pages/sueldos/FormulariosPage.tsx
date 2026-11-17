import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Eye, FileImage, Plus, Star, Trash2, Upload, X } from 'lucide-react'
import {
  abrirVistaPrevia, crearFormulario, crearFormularioEstandar, duplicarFormulario, eliminarFormulario, eliminarImagen, getFormulario, getFormularios, getImagenes, getVariablesRecibo,
  hojaMm, marcarPredeterminado, modificarFormulario, subirImagen, verImagen, type FormularioForm, type ParametroFormulario, type TipoParametro,
} from '../../api/formularios'
import { mensajeDeBlob } from '../../api/informes'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import { preguntar } from '../../components/ui/Confirmar'

const TIPOS: { v: TipoParametro; t: string }[] = [{ v: 'TEXTO', t: 'Texto' }, { v: 'RECTANGULO', t: 'Rectángulo' }, { v: 'LINEA', t: 'Línea' }, { v: 'IMAGEN', t: 'Imagen' }, { v: 'CONCEPTOS', t: 'Cuadro de conceptos' }]
const FUENTES = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Calibri']

const nuevo: FormularioForm = {
  codigo: '', descripcion: '', orientacion: 'VERTICAL', tamanoPagina: 'A4', margenIzquierdo: 10, margenSuperior: 10, margenDerecho: 10, margenInferior: 10, columnas: 1, filas: 1,
  idFormularioHermano: null, formulaArchivo: null, activo: true, parametros: [],
}
const nuevoParametro = (n: number): ParametroFormulario => ({
  nombre: `PARAMETRO_${n}`, tipo: 'TEXTO', texto: '', posX: 5, posY: 5, ancho: 60, alto: 5, fuente: 'Arial', tamano: 8, negrita: false, cursiva: false, alineacion: 'IZQUIERDA',
  colorTexto: '#000000', colorFondo: null, borde: false, espesor: 0.3, arco: 0, imprimir: true,
})

/** Listado de diseños de recibo, con las imágenes de la empresa (la firma). */
export function FormulariosPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const puedeCrear = tienePermiso(permisos, 'SLD', 'crear')
  const puedeModificar = tienePermiso(permisos, 'SLD', 'modificar')
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sueldos', 'formularios'], queryFn: getFormularios })
  const { data: imagenes } = useQuery({ queryKey: ['sueldos', 'imagenes'], queryFn: getImagenes })
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [nombreImg, setNombreImg] = useState('FIRMA')
  const refArchivo = useRef<HTMLInputElement>(null)
  const refrescar = () => qc.invalidateQueries({ queryKey: ['sueldos', 'formularios'] })
  const alError = (e: unknown) => setMsg({ tipo: 'error', texto: mensajeDeError(e) })

  const estandar = useMutation({
    mutationFn: () => { const c = prompt('Código del diseño:', 'RECIBO'); if (!c) throw new Error('cancelado'); return crearFormularioEstandar(c) },
    onSuccess: (f) => { refrescar(); navigate(`/sueldos/formularios/${f.idFormulario}`) },
    onError: (e) => { if ((e as Error).message !== 'cancelado') alError(e) },
  })
  const duplicar = useMutation({
    mutationFn: (id: number) => { const c = prompt('Código de la copia:'); if (!c) throw new Error('cancelado'); return duplicarFormulario(id, c) },
    onSuccess: (f) => { refrescar(); navigate(`/sueldos/formularios/${f.idFormulario}`) },
    onError: (e) => { if ((e as Error).message !== 'cancelado') alError(e) },
  })
  const predeterminado = useMutation({ mutationFn: ({ id, v }: { id: number; v: boolean }) => marcarPredeterminado(id, v), onSuccess: () => { refrescar(); setMsg({ tipo: 'ok', texto: 'Listo.' }) }, onError: alError })
  const subir = useMutation({
    mutationFn: (a: File) => subirImagen(nombreImg.trim().toUpperCase(), a),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'imagenes'] }); setMsg({ tipo: 'ok', texto: 'Imagen guardada.' }); if (refArchivo.current) refArchivo.current.value = '' },
    onError: alError,
  })
  const borrarImg = useMutation({ mutationFn: eliminarImagen, onSuccess: () => qc.invalidateQueries({ queryKey: ['sueldos', 'imagenes'] }), onError: alError })

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Diseño de recibos de sueldo</h1>
          <p className="text-gray-500">Diseñá cómo se imprime el recibo: la hoja, cuántas copias por hoja y qué va en cada lugar. El diseño marcado con ★ es el que se usa al imprimir.</p>
        </div>
        {puedeCrear && (
          <div className="flex gap-2 shrink-0">
            <BotonSecundario onClick={() => { setMsg(null); estandar.mutate() }} disabled={estandar.isPending}>Crear el diseño estándar</BotonSecundario>
            <Link to="/sueldos/formularios/nuevo" className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2 rounded-lg text-sm"><Plus size={16} /> Nuevo diseño</Link>
          </div>
        )}
      </div>
      {msg && <div className="mb-3"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium w-8"></th><th className="px-4 py-2 font-medium">Diseño</th><th className="px-4 py-2 font-medium">Descripción</th><th className="px-4 py-2 font-medium">Hoja</th>
              <th className="px-4 py-2 font-medium text-right">Copias</th><th className="px-4 py-2 font-medium text-right">Parámetros</th><th className="px-4 py-2"></th>
            </tr></thead>
            <tbody>
              {data.map((x) => (
                <tr key={x.idFormulario} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${x.activo ? '' : 'text-gray-400'}`}>
                  <td className="px-4 py-2">{puedeModificar && (
                    <button title={x.predeterminado ? 'Es el que se usa al imprimir (clic para dejar de usarlo)' : 'Usar este diseño al imprimir'} onClick={() => predeterminado.mutate({ id: x.idFormulario, v: !x.predeterminado })}>
                      <Star size={16} className={x.predeterminado ? 'fill-amber-400 text-amber-500' : 'text-gray-300 hover:text-amber-500'} />
                    </button>
                  )}</td>
                  <td className="px-4 py-2 font-mono text-xs"><Link to={`/sueldos/formularios/${x.idFormulario}`} className="text-blue-700 hover:underline">{x.codigo}</Link></td>
                  <td className="px-4 py-2">{x.descripcion}</td>
                  <td className="px-4 py-2">{x.tamanoPagina} {x.orientacion === 'HORIZONTAL' ? 'horizontal' : 'vertical'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{x.columnas * x.filas}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{x.parametros}</td>
                  <td className="px-4 py-2 text-right">{puedeCrear && <button title="Duplicar" onClick={() => { setMsg(null); duplicar.mutate(x.idFormulario) }} className="text-gray-400 hover:text-blue-700"><Copy size={15} /></button>}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Todavía no hay diseños: los recibos se imprimen con el formato clásico. Creá el diseño estándar para empezar a modificarlo.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold text-gray-800 inline-flex items-center gap-2 mb-1"><FileImage size={17} /> Imágenes de la empresa</h2>
        <p className="text-sm text-gray-500 mb-3">La firma (y un sello, si hace falta) se usan en el diseño con un parámetro de tipo Imagen cuyo texto es el nombre de la imagen. El logo se carga en los datos de la empresa y se usa con <code>EMPRESA_LOGO</code>. PNG o JPG de hasta 1 MB; para la firma conviene un PNG con fondo transparente.</p>
        <ul className="flex flex-wrap gap-2 mb-3">
          {(imagenes ?? []).map((n) => (
            <li key={n} className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full pl-3 pr-1.5 py-1 text-xs">
              <button onClick={() => verImagen(n).catch(async (e) => setMsg({ tipo: 'error', texto: await mensajeDeBlob(e) }))} className="font-mono text-blue-700 hover:underline">{n}</button>
              {puedeModificar && <button title="Borrar la imagen" onClick={() => { preguntar(`¿Borrar la imagen ${n}?`, () => borrarImg.mutate(n), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} className="text-red-400 hover:text-red-600"><X size={14} /></button>}
            </li>
          ))}
          {imagenes?.length === 0 && <li className="text-xs text-gray-400">No hay imágenes cargadas.</li>}
        </ul>
        {puedeModificar && (
          <div className="flex flex-wrap items-end gap-2">
            <Campo label="Nombre" className="w-40"><input value={nombreImg} onChange={(e) => setNombreImg(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))} maxLength={40} className={`${inputCls} font-mono`} /></Campo>
            <input ref={refArchivo} type="file" accept="image/png,image/jpeg" className="text-sm" />
            <BotonSecundario onClick={() => { const a = refArchivo.current?.files?.[0]; if (!a) { setMsg({ tipo: 'error', texto: 'Elegí primero el archivo de la imagen.' }); return } setMsg(null); subir.mutate(a) }} disabled={!nombreImg.trim() || subir.isPending} className="inline-flex items-center gap-1.5"><Upload size={14} /> Subir</BotonSecundario>
          </div>
        )}
      </section>
    </div>
  )
}

/** Dibujo del recibo (una celda de la hoja) a escala: cada parámetro es una caja que se elige con un clic. */
function Lienzo({ f, sel, onSel }: { f: FormularioForm; sel: number | null; onSel: (i: number) => void }) {
  const [w, h] = hojaMm(f)
  const cw = (w - f.margenIzquierdo - f.margenDerecho) / f.columnas
  const ch = (h - f.margenSuperior - f.margenInferior) / f.filas
  return (
    <svg viewBox={`${-2} ${-2} ${cw + 4} ${ch + 4}`} className="w-full bg-white border border-gray-300 rounded-lg" style={{ aspectRatio: `${cw + 4} / ${ch + 4}` }}>
      <rect x={0} y={0} width={cw} height={ch} fill="none" stroke="#9ca3af" strokeDasharray="2 2" strokeWidth={0.3} />
      {f.parametros.map((p, i) => {
        const activo = sel === i
        const opacidad = p.imprimir ? 1 : 0.35
        const marca = activo ? { stroke: '#1d4ed8', strokeWidth: 0.5 } : null
        if (p.tipo === 'LINEA') {
          const horizontal = p.ancho >= p.alto
          return <g key={i} onClick={() => onSel(i)} className="cursor-pointer" opacity={opacidad}>
            <rect x={p.posX} y={p.posY} width={horizontal ? p.ancho : Math.max(p.espesor, 0.3)} height={horizontal ? Math.max(p.espesor, 0.3) : p.alto} fill={p.colorTexto} />
            <rect x={p.posX - 1} y={p.posY - 1} width={(horizontal ? p.ancho : 0.3) + 2} height={(horizontal ? 0.3 : p.alto) + 2} fill="transparent" {...(marca ?? {})} />
          </g>
        }
        const relleno = p.colorFondo ?? (p.tipo === 'CONCEPTOS' ? '#f3f4f6' : p.tipo === 'IMAGEN' ? '#e0f2fe' : 'none')
        return (
          <g key={i} onClick={() => onSel(i)} className="cursor-pointer" opacity={opacidad}>
            <rect x={p.posX} y={p.posY} width={p.ancho} height={p.alto} rx={p.arco} fill={relleno} stroke={marca?.stroke ?? (p.borde || p.tipo === 'RECTANGULO' ? p.colorTexto : p.tipo === 'TEXTO' ? '#d1d5db' : '#9ca3af')}
              strokeWidth={marca?.strokeWidth ?? (p.borde || p.tipo === 'RECTANGULO' ? Math.max(p.espesor, 0.2) : 0.15)} strokeDasharray={p.tipo === 'TEXTO' && !p.borde ? '0.8 0.8' : undefined} />
            {p.tipo === 'TEXTO' && <text x={p.alineacion === 'DERECHA' ? p.posX + p.ancho - 0.8 : p.alineacion === 'CENTRO' ? p.posX + p.ancho / 2 : p.posX + 0.8} y={p.posY + Math.min(p.alto, p.tamano * 0.3528 * 1.2) * 0.8}
              fontSize={Math.max(p.tamano * 0.3528, 1.4)} fill={p.colorTexto} fontFamily={p.fuente ?? 'Arial'} fontWeight={p.negrita ? 700 : 400} fontStyle={p.cursiva ? 'italic' : 'normal'}
              textAnchor={p.alineacion === 'DERECHA' ? 'end' : p.alineacion === 'CENTRO' ? 'middle' : 'start'}>{(p.texto ?? '').slice(0, 60)}</text>}
            {(p.tipo === 'IMAGEN' || p.tipo === 'CONCEPTOS') && <text x={p.posX + p.ancho / 2} y={p.posY + p.alto / 2} fontSize={2.6} fill="#6b7280" textAnchor="middle">{p.tipo === 'IMAGEN' ? `🖼 ${p.texto ?? ''}` : 'Conceptos del recibo'}</text>}
          </g>
        )
      })}
    </svg>
  )
}

/** Un diseño de recibo: la hoja, los parámetros con su dibujo a escala y la vista previa en PDF. */
export function FormularioPage() {
  const { id: idParam } = useParams()
  const id = idParam ? Number(idParam) : 0
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permisos = permisosDelToken(useAuthStore((s) => s.token))
  const puedeModificar = tienePermiso(permisos, 'SLD', id === 0 ? 'crear' : 'modificar')
  const { data, isLoading } = useQuery({ queryKey: ['sueldos', 'formulario', id], queryFn: () => getFormulario(id), enabled: id > 0 })
  const { data: lista } = useQuery({ queryKey: ['sueldos', 'formularios'], queryFn: getFormularios })
  const { data: variables } = useQuery({ queryKey: ['sueldos', 'variables-recibo'], queryFn: getVariablesRecibo })
  const [f, setF] = useState<FormularioForm>(nuevo)
  const [sucio, setSucio] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const [filtroVar, setFiltroVar] = useState('')
  useEffect(() => { if (data) { setF({ ...data, parametros: data.parametros.map((p) => ({ ...p })) }); setSucio(false); setSel(null) } }, [data])

  const visibles = useMemo(() => {
    const q = filtroVar.trim().toLowerCase()
    return (variables ?? []).filter((v) => !q || v.nombre.toLowerCase().includes(q) || v.descripcion.toLowerCase().includes(q))
  }, [variables, filtroVar])

  const cambia = (c: Partial<FormularioForm>) => { setF((x) => ({ ...x, ...c })); setSucio(true); setMsg(null) }
  const setParam = (i: number, c: Partial<ParametroFormulario>) => cambia({ parametros: f.parametros.map((x, k) => (k === i ? { ...x, ...c } : x)) })
  const num = (s: string) => (s === '' || isNaN(Number(s)) ? 0 : Number(s))
  const p = sel !== null ? f.parametros[sel] : null

  function insertar(nombre: string) {
    if (sel === null || !p || p.tipo !== 'TEXTO') { setMsg({ tipo: 'error', texto: 'Elegí primero un parámetro de tipo Texto (en el dibujo o en la lista).' }); return }
    const t = p.texto ?? ''
    setParam(sel, { texto: `${t}${t && !/\s$/.test(t) ? ' ' : ''}${nombre}` })
  }

  const guardar = useMutation({
    mutationFn: () => (id === 0 ? crearFormulario(f) : modificarFormulario(id, f)),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['sueldos', 'formularios'] }); qc.invalidateQueries({ queryKey: ['sueldos', 'formulario', id] })
      if (id === 0 && r && typeof r === 'object' && 'idFormulario' in r) navigate(`/sueldos/formularios/${(r as { idFormulario: number }).idFormulario}`, { replace: true })
      else { setSucio(false); setMsg({ tipo: 'ok', texto: 'Diseño guardado.' }) }
    },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const borrar = useMutation({
    mutationFn: () => eliminarFormulario(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sueldos', 'formularios'] }); navigate('/sueldos/formularios', { replace: true }) },
    onError: (e) => setMsg({ tipo: 'error', texto: mensajeDeError(e) }),
  })
  const previa = useMutation({ mutationFn: () => abrirVistaPrevia(id), onError: async (e) => setMsg({ tipo: 'error', texto: await mensajeDeBlob(e) }) })

  if (id > 0 && isLoading) return <p className="text-sm text-gray-500">Cargando…</p>
  const dis = !puedeModificar
  const n = (k: keyof ParametroFormulario, label: string, paso = 0.5) => p && sel !== null && (
    <Campo label={label} className="w-24"><input type="number" step={paso} value={p[k] as number} onChange={(e) => setParam(sel, { [k]: num(e.target.value) } as Partial<ParametroFormulario>)} disabled={dis} className={inputCls} /></Campo>
  )
  return (
    <div className="max-w-7xl">
      <Link to="/sueldos/formularios" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 mb-2"><ArrowLeft size={14} /> Diseño de recibos</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{id === 0 ? 'Nuevo diseño de recibo' : <><span className="font-mono">{f.codigo}</span> <span className="text-gray-400 font-normal text-lg">— {f.descripcion}</span></>}</h1>

      <section className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {id === 0 && <Campo label="Código"><input value={f.codigo} onChange={(e) => cambia({ codigo: e.target.value.toUpperCase().replace(/\s/g, '_') })} maxLength={40} className={`${inputCls} font-mono`} /></Campo>}
        <Campo label="Descripción" className={id === 0 ? 'lg:col-span-3' : 'lg:col-span-4'}><input value={f.descripcion} onChange={(e) => cambia({ descripcion: e.target.value })} disabled={dis} maxLength={150} className={inputCls} /></Campo>
        <Campo label="Hoja"><select value={f.tamanoPagina} onChange={(e) => cambia({ tamanoPagina: e.target.value as FormularioForm['tamanoPagina'] })} disabled={dis} className={inputCls}><option>A4</option><option>A5</option><option value="CARTA">Carta</option><option value="OFICIO">Oficio</option></select></Campo>
        <Campo label="Orientación"><select value={f.orientacion} onChange={(e) => cambia({ orientacion: e.target.value as 'VERTICAL' | 'HORIZONTAL' })} disabled={dis} className={inputCls}><option value="VERTICAL">Vertical</option><option value="HORIZONTAL">Horizontal</option></select></Campo>
        <Campo label="Columnas (recibos a lo ancho)"><input type="number" min={1} max={4} value={f.columnas} onChange={(e) => cambia({ columnas: Math.min(4, Math.max(1, num(e.target.value))) })} disabled={dis} className={inputCls} /></Campo>
        <Campo label="Filas (recibos a lo alto)"><input type="number" min={1} max={4} value={f.filas} onChange={(e) => cambia({ filas: Math.min(4, Math.max(1, num(e.target.value))) })} disabled={dis} className={inputCls} /></Campo>
        {(['margenIzquierdo', 'margenSuperior', 'margenDerecho', 'margenInferior'] as const).map((k) => (
          <Campo key={k} label={`Margen ${k.slice(6).toLowerCase()} (mm)`}><input type="number" min={0} max={80} step={0.5} value={f[k]} onChange={(e) => cambia({ [k]: num(e.target.value) } as Partial<FormularioForm>)} disabled={dis} className={inputCls} /></Campo>
        ))}
        <Campo label="Formulario hermano (se imprime a continuación)" className="sm:col-span-2">
          <select value={f.idFormularioHermano ?? ''} onChange={(e) => cambia({ idFormularioHermano: e.target.value ? Number(e.target.value) : null })} disabled={dis} className={inputCls}>
            <option value="">Ninguno</option>{lista?.filter((x) => x.idFormulario !== id).map((x) => <option key={x.idFormulario} value={x.idFormulario}>{x.codigo} — {x.descripcion}</option>)}
          </select>
        </Campo>
        <Campo label="Nombre del archivo PDF (fórmula, opcional)" className="sm:col-span-2"><input value={f.formulaArchivo ?? ''} onChange={(e) => cambia({ formulaArchivo: e.target.value || null })} disabled={dis} maxLength={512} placeholder={"'recibo_' + EMPLEADO_LEGAJO"} className={`${inputCls} font-mono`} /></Campo>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={f.activo} disabled={dis} onChange={(e) => cambia({ activo: e.target.checked })} /> Diseño activo</label>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="grid gap-4">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-800 text-sm">Dibujo <span className="font-normal text-gray-400">(un recibo; los de las otras columnas y filas son iguales)</span></h2>
            </div>
            <Lienzo f={f} sel={sel} onSel={setSel} />
          </section>

          {p && sel !== null && (
            <section className="bg-white border border-blue-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-gray-800 text-sm">Parámetro <span className="font-mono">{p.nombre}</span></h2>
                {puedeModificar && <button title="Quitar el parámetro" onClick={() => { cambia({ parametros: f.parametros.filter((_, k) => k !== sel) }); setSel(null) }} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Campo label="Nombre" className="w-44"><input value={p.nombre} onChange={(e) => setParam(sel, { nombre: e.target.value })} disabled={dis} maxLength={60} className={`${inputCls} font-mono`} /></Campo>
                <Campo label="Tipo" className="w-40"><select value={p.tipo} onChange={(e) => setParam(sel, { tipo: e.target.value as TipoParametro })} disabled={dis} className={inputCls}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}</select></Campo>
                {n('posX', 'Posición X')}{n('posY', 'Posición Y')}{n('ancho', 'Ancho')}{n('alto', 'Alto')}
                <label className="inline-flex items-center gap-1.5 text-sm text-gray-700 pb-2"><input type="checkbox" checked={p.imprimir} disabled={dis} onChange={(e) => setParam(sel, { imprimir: e.target.checked })} /> Imprimir</label>
              </div>
              {(p.tipo === 'TEXTO' || p.tipo === 'IMAGEN') && (
                <Campo label={p.tipo === 'IMAGEN' ? 'Imagen (EMPRESA_LOGO o el nombre de una imagen de la empresa)' : 'Texto: variables y/o texto fijo, separados por espacios'} className="mt-2">
                  <textarea value={p.texto ?? ''} onChange={(e) => setParam(sel, { texto: e.target.value })} disabled={dis} rows={p.tipo === 'IMAGEN' ? 1 : 2} maxLength={512} spellCheck={false} className={`${inputCls} font-mono`} />
                </Campo>
              )}
              {p.tipo !== 'LINEA' && p.tipo !== 'IMAGEN' && (
                <div className="flex flex-wrap items-end gap-2 mt-2">
                  <Campo label="Fuente" className="w-36"><input list="fuentes-recibo" value={p.fuente ?? ''} onChange={(e) => setParam(sel, { fuente: e.target.value || null })} disabled={dis} className={inputCls} /><datalist id="fuentes-recibo">{FUENTES.map((x) => <option key={x} value={x} />)}</datalist></Campo>
                  {n('tamano', 'Tamaño', 0.5)}
                  <Campo label="Alineación" className="w-32"><select value={p.alineacion} onChange={(e) => setParam(sel, { alineacion: e.target.value as ParametroFormulario['alineacion'] })} disabled={dis} className={inputCls}><option value="IZQUIERDA">Izquierda</option><option value="CENTRO">Centro</option><option value="DERECHA">Derecha</option></select></Campo>
                  <label className="inline-flex items-center gap-1.5 text-sm text-gray-700 pb-2"><input type="checkbox" checked={p.negrita} disabled={dis} onChange={(e) => setParam(sel, { negrita: e.target.checked })} /> Negrita</label>
                  <label className="inline-flex items-center gap-1.5 text-sm text-gray-700 pb-2"><input type="checkbox" checked={p.cursiva} disabled={dis} onChange={(e) => setParam(sel, { cursiva: e.target.checked })} /> Cursiva</label>
                </div>
              )}
              <div className="flex flex-wrap items-end gap-2 mt-2">
                <Campo label={p.tipo === 'LINEA' ? 'Color de la línea' : 'Color del texto / borde'} className="w-28"><input type="color" value={p.colorTexto} onChange={(e) => setParam(sel, { colorTexto: e.target.value })} disabled={dis} className="h-9 w-full rounded border border-gray-300" /></Campo>
                {p.tipo !== 'LINEA' && p.tipo !== 'IMAGEN' && (
                  <Campo label="Fondo" className="w-28">
                    <div className="flex items-center gap-1"><input type="color" value={p.colorFondo ?? '#ffffff'} onChange={(e) => setParam(sel, { colorFondo: e.target.value })} disabled={dis} className="h-9 flex-1 min-w-0 rounded border border-gray-300" />
                      {p.colorFondo && <button title="Sin fondo" onClick={() => setParam(sel, { colorFondo: null })} className="text-gray-400 hover:text-red-600"><X size={14} /></button>}</div>
                  </Campo>
                )}
                {p.tipo !== 'IMAGEN' && p.tipo !== 'LINEA' && <label className="inline-flex items-center gap-1.5 text-sm text-gray-700 pb-2"><input type="checkbox" checked={p.borde} disabled={dis} onChange={(e) => setParam(sel, { borde: e.target.checked })} /> Borde</label>}
                {p.tipo !== 'IMAGEN' && n('espesor', p.tipo === 'LINEA' ? 'Grosor' : 'Espesor del borde', 0.1)}
                {(p.tipo === 'RECTANGULO' || p.tipo === 'TEXTO') && n('arco', 'Arco (esquinas)', 0.5)}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-800 text-sm">Parámetros <span className="font-normal text-gray-400">({f.parametros.length})</span></h2>
              {puedeModificar && <BotonSecundario onClick={() => { cambia({ parametros: [...f.parametros, nuevoParametro(f.parametros.length + 1)] }); setSel(f.parametros.length) }} className="inline-flex items-center gap-1.5"><Plus size={14} /> Agregar parámetro</BotonSecundario>}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white"><tr className="text-left text-gray-500 border-b border-gray-100"><th className="px-3 py-1.5 font-medium">Nombre</th><th className="px-3 py-1.5 font-medium">Tipo</th><th className="px-3 py-1.5 font-medium">Texto</th><th className="px-3 py-1.5 font-medium text-right">X · Y</th><th className="px-3 py-1.5 font-medium text-right">Ancho × Alto</th><th className="px-3 py-1.5 font-medium text-center">Imprime</th></tr></thead>
                <tbody>
                  {f.parametros.map((q, i) => (
                    <tr key={i} onClick={() => setSel(i)} className={`border-b border-gray-50 cursor-pointer ${sel === i ? 'bg-blue-50' : 'hover:bg-gray-50'} ${q.imprimir ? '' : 'text-gray-400'}`}>
                      <td className="px-3 py-1 font-mono">{q.nombre}</td><td className="px-3 py-1">{TIPOS.find((t) => t.v === q.tipo)?.t}</td><td className="px-3 py-1 max-w-56 truncate">{q.texto}</td>
                      <td className="px-3 py-1 text-right tabular-nums">{q.posX} · {q.posY}</td><td className="px-3 py-1 text-right tabular-nums">{q.ancho} × {q.alto}</td><td className="px-3 py-1 text-center">{q.imprimir ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                  {f.parametros.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Sin parámetros: agregá el primero.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="bg-white border border-gray-200 rounded-xl p-3 self-start lg:sticky lg:top-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-1">Variables</h2>
          <p className="text-xs text-gray-500 mb-2">Elegí un parámetro de texto y hacé clic en una variable para agregarla.</p>
          <input value={filtroVar} onChange={(e) => setFiltroVar(e.target.value)} placeholder="Buscar" className={`${inputCls} mb-2`} />
          <ul className="max-h-[32rem] overflow-y-auto divide-y divide-gray-100 text-xs">
            {visibles.map((v) => (
              <li key={v.nombre}><button type="button" onClick={() => insertar(v.nombre)} className="w-full text-left py-1 hover:bg-blue-50 px-1" title={v.descripcion}>
                <span className="font-mono text-blue-800">{v.nombre}</span><span className="block text-gray-400">{v.descripcion}</span></button></li>
            ))}
            {visibles.length === 0 && <li className="py-2 text-gray-400 text-center">Sin resultados</li>}
          </ul>
        </aside>
      </div>

      {msg && <div className="mt-4"><Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje></div>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {puedeModificar && <BotonPrimario onClick={() => { setMsg(null); guardar.mutate() }} disabled={guardar.isPending || (id > 0 && !sucio) || !f.descripcion.trim() || (id === 0 && !f.codigo.trim())}>{guardar.isPending ? 'Guardando…' : 'Guardar diseño'}</BotonPrimario>}
        {id > 0 && <BotonSecundario onClick={() => { setMsg(null); previa.mutate() }} disabled={previa.isPending} className="inline-flex items-center gap-1.5"><Eye size={14} /> {previa.isPending ? 'Generando…' : 'Vista previa en PDF'}</BotonSecundario>}
        {sucio && <span className="text-xs text-amber-700">Hay cambios sin guardar{id > 0 ? ': la vista previa usa el diseño guardado' : ''}</span>}
        {id > 0 && tienePermiso(permisos, 'SLD', 'eliminar') && (
          <BotonSecundario onClick={() => { setMsg(null); preguntar(`¿Borrar el diseño ${f.codigo}?`, () => borrar.mutate(), { titulo: 'Borrar', boton: 'Borrar', peligro: true })}} disabled={borrar.isPending} className="ml-auto inline-flex items-center gap-1.5 text-red-600"><Trash2 size={14} /> Borrar diseño</BotonSecundario>
        )}
      </div>
    </div>
  )
}
