import { Link } from 'react-router-dom'
import { Calculator, ListChecks, Receipt, Users } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function HomePage() {
  const { nombre, empresaActual } = useAuthStore()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Hola, {nombre}</h1>
      <p className="text-gray-500 mt-1 mb-6">Trabajás con <strong>{empresaActual?.razonSocial}</strong> como {empresaActual?.rol}.</p>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Sueldos</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/sueldos/empleados" className="bg-white border border-gray-200 hover:border-blue-400 rounded-xl p-5 transition-colors">
          <Users className="text-blue-700 mb-2" size={20} />
          <div className="font-medium text-gray-800">Empleados</div>
          <div className="text-sm text-gray-500">Legajos, familiares y novedades.</div>
        </Link>
        <Link to="/sueldos/liquidaciones" className="bg-white border border-gray-200 hover:border-blue-400 rounded-xl p-5 transition-colors">
          <Receipt className="text-blue-700 mb-2" size={20} />
          <div className="font-medium text-gray-800">Liquidaciones</div>
          <div className="text-sm text-gray-500">Liquidá el mes, revisá los recibos y cerrá el período.</div>
        </Link>
        <Link to="/sueldos/liquidar" className="bg-white border border-gray-200 hover:border-blue-400 rounded-xl p-5 transition-colors">
          <Calculator className="text-blue-700 mb-2" size={20} />
          <div className="font-medium text-gray-800">Probar un recibo</div>
          <div className="text-sm text-gray-500">Calculá un recibo sin guardarlo, para ver qué da.</div>
        </Link>
        <Link to="/sueldos/conceptos" className="bg-white border border-gray-200 hover:border-blue-400 rounded-xl p-5 transition-colors">
          <ListChecks className="text-blue-700 mb-2" size={20} />
          <div className="font-medium text-gray-800">Conceptos</div>
          <div className="text-sm text-gray-500">Los conceptos de liquidación de la empresa.</div>
        </Link>
      </div>
    </div>
  )
}
