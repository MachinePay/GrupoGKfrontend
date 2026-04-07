import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

const AppShell = lazy(() => import("./components/layout/AppShell.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const LancamentosPage = lazy(() => import("./pages/LancamentosPage.jsx"));
const CalendarioPage = lazy(() => import("./pages/CalendarioPage.jsx"));
const ContasPagarPage = lazy(() => import("./pages/ContasPagarPage.jsx"));
const ConciliacaoPage = lazy(() => import("./pages/ConciliacaoPage.jsx"));
const FluxoSaldoPage = lazy(() => import("./pages/FluxoSaldoPage.jsx"));
const RelatoriosPage = lazy(() => import("./pages/RelatoriosPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const ConfiguracoesPage = lazy(() => import("./pages/ConfiguracoesPage.jsx"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0f1729] text-slate-400 text-sm">
      Carregando...
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="lancamentos" element={<LancamentosPage />} />
          <Route path="calendario" element={<CalendarioPage />} />
          <Route path="conciliacao" element={<ConciliacaoPage />} />
          <Route path="contas-pagar" element={<ContasPagarPage />} />
          <Route path="fluxo-saldo" element={<FluxoSaldoPage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}
