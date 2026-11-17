import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setNavigate } from './lib/navigation'
import { ConfirmarHost } from './components/ui/Confirmar'
import LoginPage from './pages/auth/LoginPage'
import ElegirEmpresaPage from './pages/auth/ElegirEmpresaPage'
import AppLayout from './components/layout/AppLayout'
import { ProtectedRoute, RequiereEmpresa } from './components/layout/ProtectedRoute'
import HomePage from './pages/HomePage'
import LiquidarReciboPage from './pages/sueldos/LiquidarReciboPage'
import ConceptosPage from './pages/sueldos/ConceptosPage'
import ConveniosPage from './pages/sueldos/ConveniosPage'
import { GruposPage, GrupoPage } from './pages/sueldos/GruposPage'
import ConvenioPage from './pages/sueldos/ConvenioPage'
import EmpleadosPage from './pages/sueldos/EmpleadosPage'
import EmpleadoPage from './pages/sueldos/EmpleadoPage'
import LiquidacionesPage from './pages/sueldos/LiquidacionesPage'
import LiquidacionPage from './pages/sueldos/LiquidacionPage'
import ReciboPage from './pages/sueldos/ReciboPage'
import InformesPage from './pages/sueldos/InformesPage'
import { InformesPersonalizadosPage, InformePersonalizadoPage } from './pages/sueldos/InformesPersonalizadosPage'
import { FormulariosPage, FormularioPage } from './pages/sueldos/FormulariosPage'
import ImportarPage from './pages/sueldos/ImportarPage'
import { ExportadoresPage, ExportadorPage } from './pages/sueldos/ExportadoresPage'
import CopiarConceptosPage from './pages/sueldos/CopiarConceptosPage'
import NovedadesPage from './pages/sueldos/NovedadesPage'
import ConceptosGeneralesPage from './pages/sueldos/ConceptosGeneralesPage'
import TiposNovedadPage from './pages/sueldos/TiposNovedadPage'
import FormulasAuxiliaresPage from './pages/sueldos/FormulasAuxiliaresPage'
import { TablasPage, TablaPage } from './pages/sueldos/TablasPage'
import UsuariosPage from './pages/sistema/UsuariosPage'
import EmpresasPage from './pages/sistema/EmpresasPage'
import ClientesPage from './pages/sistema/ClientesPage'
import ReciboConfigPage from './pages/sistema/ReciboConfigPage'
import ConfiguracionPage from './pages/sistema/ConfiguracionPage'
import MisEmpresasPage from './pages/sistema/MisEmpresasPage'
import CambiarClavePage from './pages/auth/CambiarClavePage'
import LimpiezaPage from './pages/sistema/LimpiezaPage'
import CopiarDatosPage from './pages/sistema/CopiarDatosPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 } } })

// Registra useNavigate() para que el interceptor de axios (fuera de React) pueda redirigir al vencer la sesión
function NavigationBridge() {
  const navigate = useNavigate()
  useEffect(() => setNavigate(navigate), [navigate])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <NavigationBridge />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/empresa" element={<ElegirEmpresaPage />} />
            <Route path="/cambiar-clave" element={<CambiarClavePage />} />

            <Route element={<RequiereEmpresa />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/sueldos/liquidaciones" element={<LiquidacionesPage />} />
                <Route path="/sueldos/liquidaciones/:id" element={<LiquidacionPage />} />
                <Route path="/sueldos/liquidaciones/:id/recibos/:idRecibo" element={<ReciboPage />} />
                <Route path="/sueldos/informes" element={<InformesPage />} />
                <Route path="/sueldos/informes-personalizados" element={<InformesPersonalizadosPage />} />
                <Route path="/sueldos/informes-personalizados/nuevo" element={<InformePersonalizadoPage />} />
                <Route path="/sueldos/informes-personalizados/:id" element={<InformePersonalizadoPage />} />
                <Route path="/sueldos/formularios" element={<FormulariosPage />} />
                <Route path="/sueldos/formularios/nuevo" element={<FormularioPage />} />
                <Route path="/sueldos/formularios/:id" element={<FormularioPage />} />
                <Route path="/sueldos/novedades" element={<NovedadesPage />} />
                <Route path="/sueldos/copiar-conceptos" element={<CopiarConceptosPage />} />
                <Route path="/sueldos/exportadores" element={<ExportadoresPage />} />
                <Route path="/sueldos/exportadores/nuevo" element={<ExportadorPage />} />
                <Route path="/sueldos/exportadores/:id" element={<ExportadorPage />} />
                <Route path="/sueldos/importar" element={<Navigate to="/sueldos/importar/empleados" replace />} />
                <Route path="/sueldos/importar/:tipo" element={<ImportarPage />} />
                <Route path="/sueldos/liquidar" element={<LiquidarReciboPage />} />
                <Route path="/sueldos/conceptos" element={<ConceptosPage />} />
                <Route path="/sueldos/grupos" element={<GruposPage />} />
                <Route path="/sueldos/grupos/:id" element={<GrupoPage />} />
                <Route path="/sueldos/conceptos-generales" element={<ConceptosGeneralesPage />} />
                <Route path="/sueldos/tipos-novedad" element={<TiposNovedadPage />} />
                <Route path="/sueldos/formulas-auxiliares" element={<FormulasAuxiliaresPage />} />
                <Route path="/sueldos/tablas" element={<TablasPage />} />
                <Route path="/sueldos/tablas/:id" element={<TablaPage />} />
                <Route path="/sueldos/convenios" element={<ConveniosPage />} />
                <Route path="/sueldos/convenios/:id" element={<ConvenioPage />} />
                <Route path="/sueldos/empleados" element={<EmpleadosPage />} />
                <Route path="/sueldos/empleados/nuevo" element={<EmpleadoPage />} />
                <Route path="/sueldos/empleados/:id" element={<EmpleadoPage />} />
                <Route path="/sistema/usuarios" element={<UsuariosPage />} />
                <Route path="/sistema/empresas" element={<EmpresasPage />} />
                <Route path="/sistema/clientes" element={<ClientesPage />} />
                <Route path="/sistema/recibo" element={<ReciboConfigPage />} />
                <Route path="/sistema/configuracion" element={<ConfiguracionPage />} />
                <Route path="/sistema/mis-empresas" element={<MisEmpresasPage />} />
                <Route path="/sistema/limpieza" element={<LimpiezaPage />} />
                <Route path="/sistema/copiar-datos" element={<CopiarDatosPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ConfirmarHost />
    </QueryClientProvider>
  )
}
