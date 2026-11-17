import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, RotateCcw, Rocket, Trash2 } from 'lucide-react'
import { getActividadesEmpresa, guardarActividades, type Actividad } from '../../api/clientes'
import SelectorActividades from '../../components/sistema/SelectorActividades'
import { EtiquetaTipo, GuiaEmpresas, estiloEntorno } from '../../components/sistema/TipoEmpresa'
import { activos, useCatalogos } from '../../hooks/useCatalogos'
import { bajaEmpresa, crearEmpresa, eliminarEmpresa, getBasesParaCopiar, getEmpresas, getMiCuenta, modificarEmpresa, pasarAProduccion, reactivarEmpresa, type EmpresaForm, type OpcionesCopia } from '../../api/sistema'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { seleccionarEmpresa } from '../../api/auth'
import { mensajeDeError } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import Modal from '../../components/ui/Modal'
import Pestanias from '../../components/ui/Pestanias'
import { BotonPrimario, BotonSecundario, Campo, Mensaje, inputCls } from '../../components/ui/Campos'
import type { EmpresaDetalle } from '../../types/sistema'
import { Paginador, usePaginado } from '../../components/ui/Paginador'
import { preguntar } from '../../components/ui/Confirmar'

const vacia: EmpresaForm = {
  codigo: '', razonSocial: '', nombreFantasia: null, cuit: null, condicionIva: null, actividad: null, domicilio: null,
  localidad: null, provincia: null, codigoPostal: null, telefono: null, email: null, ingresosBrutos: null, tipoEmpleador: null, codigoZona: null,
}

/** A qué campo del formulario se refiere un error que devolvió el servidor (para llevar a la persona a la pestaña y marcarlo). */
function campoDelError(mensaje: string): 'codigo' | 'razonSocial' | 'cuit' | null {
  const m = mensaje.toLowerCase()
  if (m.includes('código') && !m.includes('postal') && !m.includes('zona')) return 'codigo'
  if (m.includes('razón social')) return 'razonSocial'
  if (m.includes('cuit')) return 'cuit'
  return null
}

const partes: { clave: keyof OpcionesCopia; titulo: string; detalle: string }[] = [
  { clave: 'conceptos', titulo: 'Conceptos y grupos', detalle: 'Conceptos con sus fórmulas, fórmulas auxiliares y grupos de conceptos' },
  { clave: 'tablas', titulo: 'Tablas de datos', detalle: 'Escalas de Ganancias, topes y demás tablas' },
  { clave: 'convenios', titulo: 'Convenios', detalle: 'Con sus categorías, escalas de sueldos y sindicatos' },
  { clave: 'novedades', titulo: 'Novedades', detalle: 'Tipos de novedad y motivos de ausentismo' },
  { clave: 'informes', titulo: 'Informes', detalle: 'Informes y agrupadores' },
]

/** Alta y edición de los datos de una empresa. Las actividades se eligen del catálogo CLAE (el superadministrador). */
export function FormEmpresa({ editando, onClose }: { editando: EmpresaDetalle | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState<EmpresaForm>(editando ? { ...editando } : vacia)
  const [error, setError] = useState<string | null>(null)
  const { data: empresas, isError: errorBases, error: errBases } = useQuery({ queryKey: ['sistema', 'bases-copia'], queryFn: getBasesParaCopiar, enabled: !editando })
  const [base, setBase] = useState('')
  const [baseElegida, setBaseElegida] = useState(false)
  const [copiar, setCopiar] = useState<OpcionesCopia>({ conceptos: true, tablas: true, convenios: true, novedades: true, informes: true })
  // la empresa base por defecto es MASTER (la que guarda la configuración inicial); se puede cambiar o dejar vacía
  const master = empresas?.find((x) => x.tipo === 'MASTER')
  const baseActual = baseElegida ? base : (master ? String(master.idEmpresa) : '')
  const cat = useCatalogos()
  const [entorno, setEntorno] = useState(editando?.tipo ?? 'CLIENTE')
  const [campoError, setCampoError] = useState<'codigo' | 'razonSocial' | 'cuit' | null>(null)
  const marca = (c: 'codigo' | 'razonSocial' | 'cuit') => (campoError === c ? `${inputCls} !border-red-500 !ring-1 !ring-red-300` : inputCls)
  const [pestania, setPestania] = useState<'general' | 'contacto' | 'fiscal' | 'inicial'>('general')
  const [limpiarProd, setLimpiarProd] = useState(true)
  // una empresa de prueba que se deja en Producción pasa a producción al guardar (sin vuelta atrás)
  const pasaAProduccion = editando?.tipo === 'PRUEBA' && entorno === 'CLIENTE'
  const set = (k: keyof EmpresaForm, v: string) => setF({ ...f, [k]: v === '' ? null : v })
  const val = (k: keyof EmpresaForm) => (f[k] as string | null) ?? ''

  // actividades (catálogo CLAE): las asigna quien crea o administra la empresa; sumar actividades nuevas al catálogo es del superadministrador. null = todavía no se tocaron
  const { esSuperadmin, empresaActual, setSesion } = useAuthStore()
  const { data: actividadesGuardadas, isError: sinAccesoActividades } = useQuery({ queryKey: ['sistema', 'empresas', editando?.idEmpresa, 'actividades'], queryFn: () => getActividadesEmpresa(editando!.idEmpresa), enabled: !!editando })
  const [actsSel, setActsSel] = useState<Actividad[] | null>(null)
  const [ppalSel, setPpalSel] = useState<number | null | undefined>(undefined)
  const acts: Actividad[] = actsSel ?? actividadesGuardadas ?? []
  const ppal = ppalSel !== undefined ? ppalSel : (actividadesGuardadas?.find((a) => a.principal)?.idActividad ?? actividadesGuardadas?.[0]?.idActividad ?? null)
  const tocoActividades = actsSel !== null || ppalSel !== undefined

  const guardar = useMutation({
    mutationFn: async () => {
      let id: number
      if (editando) {
        await modificarEmpresa(editando.idEmpresa, f); id = editando.idEmpresa
        if (pasaAProduccion) {
          await pasarAProduccion(id, limpiarProd)
          if (id === empresaActual?.idEmpresa) setSesion(await seleccionarEmpresa(id))   // para que desaparezca la franja de prueba
        }
      }
      else {
        id = (await crearEmpresa({ ...f, codigo: f.codigo.trim() }, baseActual ? Number(baseActual) : null, copiar, entorno)).empresa.idEmpresa
        // la lista de empresas del usuario viene en su sesión (también la del superadministrador): se renueva, sigue en la empresa actual, para poder elegir la nueva sin volver a ingresar
        if (empresaActual) setSesion(await seleccionarEmpresa(empresaActual.idEmpresa))
      }
      if (tocoActividades) await guardarActividades(id, acts.map((a) => a.idActividad), ppal && acts.some((a) => a.idActividad === ppal) ? ppal : (acts[0]?.idActividad ?? null))
    },
    onSuccess: () => { if (pasaAProduccion) qc.invalidateQueries(); else { qc.invalidateQueries({ queryKey: ['sistema', 'empresas'] }); qc.invalidateQueries({ queryKey: ['sistema', 'clientes'] }); qc.invalidateQueries({ queryKey: ['sistema', 'mi-cuenta'] }); qc.invalidateQueries({ queryKey: ['sistema', 'bases-copia'] }) } onClose() },
    onError: (e) => {
      const m = mensajeDeError(e)
      setError(m)
      const c = campoDelError(m)
      setCampoError(c)
      if (c) setPestania('general')   // los tres campos están en General: se vuelve ahí para que se vea cuál es
    },
  })

  return (
    <Modal titulo={editando ? `Editar ${editando.razonSocial}` : 'Nueva empresa'} onClose={onClose} ancho="max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); setError(null); setCampoError(null); guardar.mutate() }} className="space-y-4">
        <Pestanias activa={pestania} onChange={setPestania} items={[
          { clave: 'general', titulo: 'General', aviso: !f.razonSocial.trim() || (!editando && !f.codigo.trim()) },
          { clave: 'contacto', titulo: 'Domicilio y contacto' },
          { clave: 'fiscal', titulo: 'Fiscal y actividades' },
          ...(!editando ? [{ clave: 'inicial' as const, titulo: 'Configuración inicial' }] : []),
        ]} />
        <div className="grid sm:grid-cols-2 gap-4 min-h-[19rem] content-start">
        {pestania === 'general' && <>
        <Campo label="Código (alias corto)">
          <input value={f.codigo} onChange={(e) => { setCampoError(null); setF({ ...f, codigo: e.target.value.replace(/\s+/g, '_') }) }} maxLength={30} disabled={!!editando} className={marca('codigo')} />
          {!editando && <p className="text-xs text-gray-500 mt-1">Sin espacios: letras, números, guion o guion bajo. Ej.: ESTUDIO_PEREZ</p>}
        </Campo>
        <Campo label="CUIT"><input value={val('cuit')} onChange={(e) => { setCampoError(null); set('cuit', e.target.value) }} placeholder="20-12345678-9" className={marca('cuit')} /></Campo>
        <Campo label="Razón social" className="sm:col-span-2"><input value={f.razonSocial} onChange={(e) => { setCampoError(null); setF({ ...f, razonSocial: e.target.value }) }} className={marca('razonSocial')} /></Campo>
        <Campo label="Nombre de fantasía"><input value={val('nombreFantasia')} onChange={(e) => set('nombreFantasia', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Condición frente al IVA">
          <select value={val('condicionIva')} onChange={(e) => set('condicionIva', e.target.value)} className={inputCls}>
            <option value="">—</option>
            {activos(cat.condicionesIva).map((c) => <option key={c.codigo} value={c.codigo}>{c.descripcion}</option>)}
            {f.condicionIva && !cat.condicionesIva.some((c) => c.activo && c.codigo === f.condicionIva) && <option value={f.condicionIva}>{cat.nombreCondicionIva(f.condicionIva)}</option>}
          </select>
        </Campo>
        <Campo label="Entorno" className="sm:col-span-2">
          {editando && !cat.tipoEmpresa(editando.tipo)?.altaPermitida
            ? <input disabled value={`${cat.tipoEmpresa(editando.tipo)?.descripcion ?? editando.tipo}${cat.tipoEmpresa(editando.tipo)?.detalle ? `: ${cat.tipoEmpresa(editando.tipo)?.detalle}` : ''}`} className={inputCls} />
            : (
              <select value={entorno} onChange={(e) => setEntorno(e.target.value)} disabled={!!editando && editando.tipo !== 'PRUEBA'} className={inputCls}>
                {activos(cat.tiposEmpresa).filter((t) => t.altaPermitida).map((t) => <option key={t.codigo} value={t.codigo}>{t.descripcion}: {t.detalle}</option>)}
              </select>
            )}
          {editando && editando.tipo !== 'PRUEBA' && cat.tipoEmpresa(editando.tipo)?.altaPermitida && <p className="text-xs text-gray-500 mt-1">Una empresa en producción no vuelve a prueba.</p>}
          {cat.tipoEmpresa(entorno)?.marcaAgua && <p className="text-xs text-gray-500 mt-1">La empresa de prueba muestra una franja amarilla en todas las pantallas, sus recibos e informes salen con la marca de agua PRUEBA y no cuenta como cliente en las estadísticas. Cuando esté lista, elegí Producción acá mismo.</p>}
          {pasaAProduccion && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-gray-600">Al guardar, la empresa <strong>pasa a producción y no se puede volver a prueba</strong>: se quita la franja amarilla y la marca de agua.</p>
              <label className="flex items-start gap-2 cursor-pointer border border-gray-200 rounded-lg p-2.5 text-sm">
                <input type="checkbox" className="mt-1" checked={limpiarProd} onChange={(e) => setLimpiarProd(e.target.checked)} />
                <span><span className="font-medium">Borrar los datos de prueba (recomendado)</span><span className="block text-xs text-gray-500">Empleados, novedades, ausentismos, liquidaciones y recibos. Se conserva la configuración, las sucursales, el logo y los usuarios.</span></span>
              </label>
              {limpiarProd ? <Mensaje tipo="error">El borrado no se puede deshacer.</Mensaje> : <Mensaje tipo="aviso">Los empleados y liquidaciones de prueba quedan en la empresa real.</Mensaje>}
            </div>
          )}
        </Campo>
        </>}
        {pestania === 'fiscal' && <>
        <Campo label="Actividades (catálogo CLAE)" className="sm:col-span-2">
          {editando && sinAccesoActividades ? <p className="text-sm text-gray-400">No tenés permiso para ver ni cambiar las actividades de esta empresa.</p>
            : editando && !actividadesGuardadas ? <p className="text-sm text-gray-400">Cargando…</p>
            : <SelectorActividades acts={acts} setActs={setActsSel} ppal={ppal} setPpal={setPpalSel} permitirCrear={esSuperadmin} />}
        </Campo>
        </>}
        {pestania === 'contacto' && <>
        <Campo label="Domicilio" className="sm:col-span-2"><input value={val('domicilio')} onChange={(e) => set('domicilio', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Localidad"><input value={val('localidad')} onChange={(e) => set('localidad', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Provincia"><input value={val('provincia')} onChange={(e) => set('provincia', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Código postal"><input value={val('codigoPostal')} onChange={(e) => set('codigoPostal', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Teléfono"><input value={val('telefono')} onChange={(e) => set('telefono', e.target.value)} className={inputCls} /></Campo>
        <Campo label="Email" className="sm:col-span-2"><input type="email" value={val('email')} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Campo>
        </>}
        {pestania === 'fiscal' && <>
        <Campo label="Ingresos Brutos (nº de inscripción)"><input value={val('ingresosBrutos')} onChange={(e) => set('ingresosBrutos', e.target.value)} maxLength={20} className={inputCls} /></Campo>
        <Campo label="Tipo de empleador">
          <select value={val('tipoEmpleador')} onChange={(e) => set('tipoEmpleador', e.target.value)} className={inputCls}>
            <option value="">—</option>
            {activos(cat.tiposEmpleador).map((t) => <option key={t.codigo} value={t.codigo}>{t.descripcion}</option>)}
            {f.tipoEmpleador && !cat.tiposEmpleador.some((t) => t.activo && t.codigo === f.tipoEmpleador) && <option value={f.tipoEmpleador}>{cat.nombreTipoEmpleador(f.tipoEmpleador)}</option>}
          </select>
        </Campo>
        <Campo label="Código de zona"><input value={val('codigoZona')} onChange={(e) => set('codigoZona', e.target.value)} maxLength={10} className={inputCls} /></Campo>
        </>}

        {!editando && pestania === 'inicial' && (
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500 mb-3">La empresa nueva arranca con una <strong>copia</strong> de la configuración de la empresa base: de ahí salen sus conceptos, fórmulas, tablas y convenios. Después es independiente: lo que cambies en una no afecta a la otra. Lo recomendado es copiar de <strong>MASTER</strong> (la plantilla).</p>
            <Campo label="Copiar la configuración de (empresa base)">
              <p className="text-xs text-gray-500 mb-1">Solo se puede heredar de la plantilla MASTER, de la DEMO o de una empresa tuya.</p>
              {errorBases && <p className="text-xs text-red-600 mb-1">No se pudo cargar la lista de empresas base: {mensajeDeError(errBases)} Si recién se actualizó el sistema, reiniciá la API y recargá la página.</p>}
              <select value={baseActual} onChange={(e) => { setBase(e.target.value); setBaseElegida(true) }} className={inputCls}>
                <option value="">Ninguna: empresa vacía (sin conceptos ni convenios)</option>
                {empresas?.slice().sort((a, b) => Number(b.tipo === 'MASTER') - Number(a.tipo === 'MASTER')).map((x) => <option key={x.idEmpresa} value={x.idEmpresa}>{x.codigo} — {x.razonSocial}{x.tipo === 'MASTER' ? ' (plantilla, recomendada)' : x.tipo === 'DEMO' ? ' (demo)' : ''}</option>)}
              </select>
            </Campo>
            {baseActual && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-gray-500">Qué se copia (no se copian empleados, liquidaciones, usuarios, sucursales ni logo):</p>
                {partes.map((p) => (
                  <label key={p.clave} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={copiar[p.clave]} onChange={(e) => setCopiar({ ...copiar, [p.clave]: e.target.checked })} />
                    <span><span className="font-medium text-gray-700">{p.titulo}</span> <span className="text-xs text-gray-400">— {p.detalle}</span></span>
                  </label>
                ))}
                {baseActual && empresas?.find((x) => String(x.idEmpresa) === baseActual)?.tipo === 'CLIENTE' && <p className="text-xs text-amber-600">Estás copiando de una empresa cliente: se copia también lo que ese cliente haya personalizado. Para una empresa nueva conviene la plantilla MASTER.</p>}
                {!copiar.conceptos && copiar.convenios && <p className="text-xs text-amber-600">Sin los conceptos, los convenios quedan sin grupo de conceptos.</p>}
              </div>
            )}
          </div>
        )}
        </div>
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <div className="flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="submit" disabled={guardar.isPending || !f.razonSocial.trim() || (!editando && !f.codigo.trim())}>{guardar.isPending ? (baseActual ? 'Creando y copiando…' : 'Guardando…') : 'Guardar'}</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

/** Confirma el paso de una empresa de prueba a producción, con la opción de borrar antes los datos de prueba. */
function PasarAProduccionModal({ e, onClose }: { e: EmpresaDetalle; onClose: () => void }) {
  const qc = useQueryClient()
  const { empresaActual, setSesion } = useAuthStore()
  const [limpiar, setLimpiar] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pasar = useMutation({
    mutationFn: async () => {
      const borrados = await pasarAProduccion(e.idEmpresa, limpiar)
      // si es la empresa en la que está trabajando, se renueva la sesión: la franja de prueba tiene que desaparecer
      if (e.idEmpresa === empresaActual?.idEmpresa) setSesion(await seleccionarEmpresa(e.idEmpresa))
      return borrados
    },
    onSuccess: () => { qc.invalidateQueries(); onClose() },
    onError: (err) => setError(mensajeDeError(err)),
  })
  return (
    <Modal titulo={`Pasar ${e.razonSocial} a producción`} onClose={onClose}>
      <div className="space-y-4 text-sm text-gray-700">
        <p>La empresa deja de ser de prueba: se quita la franja amarilla, los recibos e informes salen sin la marca PRUEBA y pasa a contar como cliente. <strong>No se puede volver a prueba.</strong></p>
        <label className="flex items-start gap-2 cursor-pointer border border-gray-200 rounded-lg p-3">
          <input type="checkbox" className="mt-1" checked={limpiar} onChange={(ev) => setLimpiar(ev.target.checked)} />
          <span>
            <span className="font-medium">Borrar los datos de prueba (recomendado)</span>
            <span className="block text-xs text-gray-500">Se borran los empleados, novedades, ausentismos, liquidaciones y recibos. Se conservan la configuración (conceptos, convenios, tablas, informes), las sucursales, el logo y los usuarios.</span>
          </span>
        </label>
        {!limpiar && <Mensaje tipo="aviso">Los empleados y liquidaciones de prueba quedan en la empresa real. Revisalos antes de liquidar sueldos de verdad.</Mensaje>}
        {limpiar && <Mensaje tipo="error">El borrado no se puede deshacer.</Mensaje>}
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <div className="flex justify-end gap-2">
          <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario type="button" onClick={() => { setError(null); pasar.mutate() }} disabled={pasar.isPending}>{pasar.isPending ? 'Pasando…' : limpiar ? 'Borrar datos y pasar a producción' : 'Pasar a producción'}</BotonPrimario>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Empresas. Las crea quien tiene un rol de sistema que lo permite (hasta su límite); solo el superadministrador las da de baja.
 * Cada usuario ve las suyas más la plantilla MASTER (solo lectura) y la DEMO (práctica).
 */
export default function EmpresasPage() {
  const qc = useQueryClient()
  const { esSuperadmin, empresaActual, token } = useAuthStore()
  const { data: cuenta } = useQuery({ queryKey: ['sistema', 'mi-cuenta'], queryFn: getMiCuenta })
  const puedeCrear = esSuperadmin || !!cuenta?.puedeCrearBases
  const sinCupo = !esSuperadmin && !!cuenta && cuenta.limiteBases !== null && cuenta.basesCreadas >= cuenta.limiteBases
  // editar los datos de la empresa o pasarla a producción exige el permiso de modificar Sistema en ella (MASTER y DEMO no lo dan)
  const puedeEditarEmpresa = (idEmpresa: number) => esSuperadmin || (idEmpresa === empresaActual?.idEmpresa && tienePermiso(permisosDelToken(token), 'SYS', 'modificar'))
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['sistema', 'empresas'], queryFn: getEmpresas })
  const cat = useCatalogos()
  const [fTipo, setFTipo] = useState('')
  const [fEstado, setFEstado] = useState<'activas' | 'bajas' | 'todas'>('todas')
  const filtradas = data?.filter((e) => (!fTipo || e.tipo === fTipo) && (fEstado === 'todas' || (fEstado === 'activas') === e.activo))
  const pag = usePaginado(filtradas)
  const [modal, setModal] = useState<{ editando: EmpresaDetalle | null } | null>(null)
  const [aProduccion, setAProduccion] = useState<EmpresaDetalle | null>(null)
  const [aEliminar, setAEliminar] = useState<EmpresaDetalle | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const cambiarEstado = useMutation({
    mutationFn: (e: EmpresaDetalle) => (e.activo ? bajaEmpresa(e.idEmpresa) : reactivarEmpresa(e.idEmpresa)),
    onSuccess: () => { setAviso(null); qc.invalidateQueries({ queryKey: ['sistema', 'empresas'] }) },
    onError: (e) => setAviso(mensajeDeError(e)),
  })

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Empresas</h1>
          <p className="text-gray-500">{esSuperadmin ? 'Todas las empresas del sistema.' : 'Tus empresas, más la plantilla MASTER (solo lectura) y la DEMO (para practicar).'}</p>
          {!esSuperadmin && cuenta?.puedeCrearBases && <p className="text-xs text-gray-500 mt-0.5">Creaste {cuenta.basesCreadas} {cuenta.limiteBases !== null ? `de ${cuenta.limiteBases} ` : ''}empresas{sinCupo ? '. Llegaste al límite: pedile al administrador del sistema que lo amplíe.' : '.'}</p>}
        </div>
        {puedeCrear && <BotonPrimario onClick={() => setModal({ editando: null })} disabled={sinCupo} className="inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"><Plus size={16} /> Nueva empresa</BotonPrimario>}
      </div>

      {esSuperadmin && <GuiaEmpresas />}
      {esSuperadmin && (
        <div className="flex flex-wrap gap-3 mb-3">
          <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className={`${inputCls} !w-auto`} aria-label="Filtrar por tipo de empresa">
            <option value="">Todos los tipos</option>{activos(cat.tiposEmpresa).map((t) => <option key={t.codigo} value={t.codigo}>{t.descripcion}</option>)}
          </select>
          <select value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)} className={`${inputCls} !w-auto`} aria-label="Filtrar por estado">
            <option value="todas">Activas y de baja</option><option value="activas">Solo activas</option><option value="bajas">Solo de baja</option>
          </select>
        </div>
      )}
      {aviso && <div className="mb-4"><Mensaje tipo="error">{aviso}</Mensaje></div>}
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {isError && <Mensaje tipo="error">{mensajeDeError(error)}</Mensaje>}

      {data && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2 font-medium">Código</th><th className="px-4 py-2 font-medium">Razón social</th><th className="px-4 py-2 font-medium">CUIT</th>
                <th className="px-4 py-2 font-medium">Entorno</th><th className="px-4 py-2 font-medium">Estado</th><th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {pag.filas.map((e) => (
                <tr key={e.idEmpresa} className={`border-b border-gray-50 last:border-0 ${e.activo ? '' : 'text-gray-400'}`}>
                  <td className="px-4 py-2 font-mono text-xs">{e.codigo}</td>
                  <td className="px-4 py-2">{e.razonSocial}<EtiquetaTipo tipo={e.tipo} />{e.idEmpresa === empresaActual?.idEmpresa && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Actual</span>}</td>
                  <td className="px-4 py-2">{e.cuit}</td>
                  <td className="px-4 py-2 max-w-xs"><div className={`text-xs font-medium ${estiloEntorno(e.tipo)}`}>{cat.tipoEmpresa(e.tipo)?.descripcion ?? e.tipo}</div><div className="text-xs text-gray-500">{cat.tipoEmpresa(e.tipo)?.detalle}</div></td>
                  <td className="px-4 py-2 text-xs">{e.activo ? <span className="text-green-700">Activa</span> : 'De baja'}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      {puedeEditarEmpresa(e.idEmpresa) && <button title="Editar" onClick={() => setModal({ editando: e })} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={15} /></button>}
                      {e.tipo === 'PRUEBA' && puedeEditarEmpresa(e.idEmpresa) && <button title="Pasar a producción" onClick={() => setAProduccion(e)} className="p-1.5 rounded hover:bg-yellow-50 text-yellow-700"><Rocket size={15} /></button>}
                      {esSuperadmin && cat.tipoEmpresa(e.tipo)?.bajaPermitida && (e.activo
                        ? <button title="Dar de baja (desactiva la empresa; NO borra sus datos)" onClick={() => { preguntar(`¿Dar de baja ${e.razonSocial}? Solo se desactiva: nadie podrá entrar, pero sus datos se conservan en la base. Para borrarla de verdad usá "Eliminar definitivamente".`, () => cambiarEstado.mutate(e), { titulo: 'Dar de baja', boton: 'Dar de baja', peligro: true })}} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Power size={15} /></button>
                        : <button title="Reactivar" onClick={() => cambiarEstado.mutate(e)} className="p-1.5 rounded hover:bg-green-50 text-green-600"><RotateCcw size={15} /></button>)}
                      {esSuperadmin && cat.tipoEmpresa(e.tipo)?.bajaPermitida && e.idEmpresa !== empresaActual?.idEmpresa &&
                        <button title="Eliminar definitivamente (borra la empresa y todos sus datos de la base)" onClick={() => setAEliminar(e)} className="p-1.5 rounded hover:bg-red-50 text-red-700"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtradas?.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Ninguna empresa coincide con el filtro.</td></tr>}
            </tbody>
          </table>
          <Paginador pag={pag} />
        </div>
      )}
      {modal && <FormEmpresa editando={modal.editando} onClose={() => setModal(null)} />}
      {aProduccion && <PasarAProduccionModal e={aProduccion} onClose={() => setAProduccion(null)} />}
      {aEliminar && <EliminarEmpresaModal e={aEliminar} onClose={() => setAEliminar(null)} />}
    </div>
  )
}

/** Borrado físico de una empresa: se confirma escribiendo su código. No se puede deshacer. */
function EliminarEmpresaModal({ e, onClose }: { e: EmpresaDetalle; onClose: () => void }) {
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const eliminar = useMutation({
    mutationFn: () => eliminarEmpresa(e.idEmpresa, codigo),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['sistema', 'empresas'] }); onClose() },
  })
  const ok = codigo.trim().toUpperCase() === e.codigo.toUpperCase()
  return (
    <Modal titulo="Eliminar definitivamente" onClose={onClose}>
      <div className="space-y-3">
        <Mensaje tipo="aviso">Esto borra de la base <b>{e.razonSocial}</b> y todo lo suyo: empleados, liquidaciones, recibos, configuración, sucursales y roles propios. No se puede deshacer. Los usuarios no se borran, solo pierden el acceso a esta empresa. Hacé un backup antes.</Mensaje>
        <Campo label={`Escribí el código de la empresa (${e.codigo}) para confirmar`}>
          <input className={inputCls} value={codigo} onChange={(x) => setCodigo(x.target.value)} />
        </Campo>
        {eliminar.isError && <Mensaje tipo="error">{mensajeDeError(eliminar.error)}</Mensaje>}
        <div className="flex justify-end gap-2">
          <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
          <button disabled={!ok || eliminar.isPending} onClick={() => eliminar.mutate()}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg">
            {eliminar.isPending ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
