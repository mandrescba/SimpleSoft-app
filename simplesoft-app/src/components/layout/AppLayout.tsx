import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Contact, PenTool, LayoutList, Building, CalendarPlus, Copy, FileOutput, Building2, Calculator, Receipt, ChevronRight, FileText, FileUp, FunctionSquare, Home, KeyRound, ListChecks, ListPlus, BarChart3, Briefcase, Layers, LogOut, Menu, Printer, Settings, Table2, Tags, Trash2, UserCog, Users, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { BandaEmpresa } from '../sistema/TipoEmpresa'
import { permisosDelToken, tienePermiso } from '../../lib/jwt'
import { getMiCuenta } from '../../api/sistema'

interface Item {
  label: string
  icon: React.ElementType
  path?: string
  /** Módulo cuyo permiso "ver" se necesita. */
  modulo?: string
  /** Solo lo ve el superadministrador. */
  soloSuperadmin?: boolean
  /** También lo ve quien puede crear empresas (por su rol de sistema), aunque no tenga el permiso del módulo. */
  siCreaEmpresas?: boolean
}

const menu: { titulo: string; items: Item[] }[] = [
  {
    titulo: 'Sistema',
    items: [
      { label: 'Configuración', icon: Settings, path: '/sistema/configuracion' },
      { label: 'Mis empresas', icon: Building, path: '/sistema/mis-empresas' },
      { label: 'Usuarios', icon: UserCog, path: '/sistema/usuarios', modulo: 'SYS' },
      { label: 'Empresas', icon: Building2, path: '/sistema/empresas', modulo: 'SYS', siCreaEmpresas: true },
      { label: 'Clientes', icon: Contact, path: '/sistema/clientes', soloSuperadmin: true },
      { label: 'Limpieza de datos', icon: Trash2, path: '/sistema/limpieza', soloSuperadmin: true },
      { label: 'Copiar empleados', icon: Copy, path: '/sistema/copiar-datos', soloSuperadmin: true },
      { label: 'Recibo y sucursales', icon: Printer, path: '/sistema/recibo', modulo: 'SYS' },
    ],
  },
  { titulo: 'General', items: [{ label: 'Inicio', icon: Home, path: '/' }] },
  {
    titulo: 'Sueldos',
    items: [
      { label: 'Empleados', icon: Users, path: '/sueldos/empleados', modulo: 'SLD' },
      { label: 'Liquidaciones', icon: Receipt, path: '/sueldos/liquidaciones', modulo: 'SLD' },
      { label: 'Informes', icon: BarChart3, path: '/sueldos/informes', modulo: 'SLD' },
      { label: 'Informes personalizados', icon: LayoutList, path: '/sueldos/informes-personalizados', modulo: 'SLD' },
      { label: 'Diseño de recibos', icon: PenTool, path: '/sueldos/formularios', modulo: 'SLD' },
      { label: 'Novedades', icon: CalendarPlus, path: '/sueldos/novedades', modulo: 'SLD' },
      { label: 'Exportar archivos', icon: FileOutput, path: '/sueldos/exportadores', modulo: 'SLD' },
      { label: 'Importar desde Excel', icon: FileUp, path: '/sueldos/importar', modulo: 'SLD' },
      { label: 'Probar un recibo', icon: Calculator, path: '/sueldos/liquidar', modulo: 'SLD' },
      { label: 'Convenios', icon: Briefcase, path: '/sueldos/convenios', modulo: 'SLD' },
      { label: 'Conceptos', icon: ListChecks, path: '/sueldos/conceptos', modulo: 'SLD' },
      { label: 'Grupos de conceptos', icon: Layers, path: '/sueldos/grupos', modulo: 'SLD' },
      { label: 'Conceptos generales', icon: ListPlus, path: '/sueldos/conceptos-generales', modulo: 'SLD' },
      { label: 'Fórmulas auxiliares', icon: FunctionSquare, path: '/sueldos/formulas-auxiliares', modulo: 'SLD' },
      { label: 'Tablas', icon: Table2, path: '/sueldos/tablas', modulo: 'SLD' },
      { label: 'Copiar conceptos', icon: Copy, path: '/sueldos/copiar-conceptos', modulo: 'SLD' },
      { label: 'Tipos de novedad', icon: Tags, path: '/sueldos/tipos-novedad', modulo: 'SLD' },
    ],
  },
  {
    titulo: 'Próximamente',
    items: [
      { label: 'IVA', icon: FileText },
      { label: 'Contabilidad', icon: FileText },
      { label: 'Ventas', icon: FileText },
      { label: 'Compras', icon: FileText },
      { label: 'Stock', icon: FileText },
      { label: 'Fondos', icon: FileText },
    ],
  },
]

function Entrada({ item, cerrar }: { item: Item; cerrar: () => void }) {
  const Icon = item.icon
  if (!item.path) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 cursor-default select-none">
        <Icon size={16} className="shrink-0" />
        <span className="text-sm">{item.label}</span>
        <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-medium">Pronto</span>
      </div>
    )
  }
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={cerrar}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={`shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
          <span>{item.label}</span>
          {isActive && <ChevronRight size={14} className="ml-auto text-blue-500" />}
        </>
      )}
    </NavLink>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const { nombre, empresaActual, token, logout, esSuperadmin } = useAuthStore()
  const [abierto, setAbierto] = useState(false)
  const permisos = permisosDelToken(token)
  // el contador no tiene el módulo Sistema en sus empresas, pero su rol de sistema le permite crear empresas: tiene que ver la pantalla Empresas
  const { data: cuenta } = useQuery({ queryKey: ['sistema', 'mi-cuenta'], queryFn: getMiCuenta, enabled: !!token })
  const puedeCrearEmpresas = esSuperadmin || !!cuenta?.puedeCrearBases

  const salir = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="text-lg font-bold text-blue-800">SimpleSoft</div>
        <button
          onClick={() => navigate('/empresa')}
          className="mt-2 w-full flex items-center gap-2 text-left text-xs text-gray-600 hover:text-blue-700 bg-gray-50 hover:bg-blue-50 rounded-lg px-2.5 py-2 transition-colors"
          title="Cambiar de empresa"
        >
          <Building2 size={14} className="shrink-0" />
          <span className="truncate">{empresaActual?.razonSocial}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {menu.map((g) => {
          const items = g.items.filter((i) => (!i.soloSuperadmin || esSuperadmin) && (!i.modulo || tienePermiso(permisos, i.modulo) || (i.siCreaEmpresas && puedeCrearEmpresas)))
          if (items.length === 0) return null
          return (
            <div key={g.titulo}>
              <div className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{g.titulo}</div>
              <div className="space-y-0.5">
                {items.map((i) => <Entrada key={i.label} item={i} cerrar={() => setAbierto(false)} />)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <div className="text-sm font-medium text-gray-700 truncate">{nombre}</div>
        <div className="text-xs text-gray-400 mb-2">{empresaActual?.rol}</div>
        <button onClick={() => navigate('/cambiar-clave')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-700 transition-colors mb-1">
          <KeyRound size={14} /> Cambiar mi clave
        </button>
        <button onClick={salir} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors">
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:block w-64 shrink-0 bg-white border-r border-gray-200 sticky top-0 h-screen">{sidebar}</aside>

      {abierto && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-white shadow-xl">{sidebar}</div>
          <div className="flex-1 bg-black/30" onClick={() => setAbierto(false)} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3">
          <button onClick={() => setAbierto((v) => !v)} aria-label="Menú">{abierto ? <X size={20} /> : <Menu size={20} />}</button>
          <span className="font-bold text-blue-800">SimpleSoft</span>
        </header>
        <BandaEmpresa tipo={empresaActual?.tipo} />
        <main className="p-4 md:p-8 max-w-6xl"><Outlet /></main>
      </div>
    </div>
  )
}
