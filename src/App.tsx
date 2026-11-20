import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Avisos } from './components/Avisos';
import { Seo } from './components/Seo';
import { tieneInterGeneraciones } from './lib/config';
import {
  Landing, SobreNosotros, CentroDeAyuda, Tutoriales, PreguntasFrecuentes,
  Contacto, TerminosDeServicio, PoliticaDePrivacidad, Seguridad,
} from './paginasPublicas';

// Cada pantalla se descarga al abrirla: antes la app entera (1 MB) bajaba de
// una vez, y en el teléfono la primera carga se hacía larga.
const Players = lazy(() => import('./pages/Players'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Matchmaking = lazy(() => import('./pages/Matchmaking'));
const Finance = lazy(() => import('./pages/Finance'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminPlayers = lazy(() => import('./pages/AdminPlayers'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const Temporada = lazy(() => import('./pages/Temporada'));
const Vote = lazy(() => import('./pages/Vote'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const RegisterCaptain = lazy(() => import('./pages/RegisterCaptain'));
const TeamSelection = lazy(() => import('./pages/TeamSelection'));
const Arena = lazy(() => import('./pages/Arena'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ConfirmarAsistencia = lazy(() => import('./pages/ConfirmarAsistencia'));
const Checkout = lazy(() => import('./pages/Checkout'));
const InterGeneraciones = lazy(() => import('./pages/InterGeneraciones'));

/**
 * Quien ya inició sesión no necesita la portada: entra directo a su panel.
 *
 * Antes se esperaba a que Supabase confirmara la sesión, y si tardaba (por
 * ejemplo al renovar el token con mala señal) se mostraba la portada. Ahora
 * basta con que haya una sesión guardada en el teléfono para ir al panel; si
 * resulta vencida, el panel manda a iniciar sesión, nunca a la portada.
 */
function Cargando() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-soccer-green" />
    </div>
  );
}

function haySesionGuardada() {
  try {
    return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  } catch {
    return false;
  }
}

// La portada (con sus animaciones) pesa bastante y quien ya tiene sesión nunca
// la ve: se descarga aparte. A quien llega sin sesión se le empieza a bajar de
// inmediato, en paralelo con el resto, para que no note la diferencia.
if (!haySesionGuardada()) Landing.precargar().catch(() => {});

function Inicio() {
  const { user } = useAuth();
  if (user || haySesionGuardada()) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

/** Inter Generaciones es solo de Real Ebolo: los demás equipos vuelven al inicio. */
function SoloInterGeneraciones() {
  const { teamId } = useAuth();
  if (!tieneInterGeneraciones(teamId)) return <Navigate to="/dashboard" replace />;
  return <InterGeneraciones />;
}

function App() {
  return (
    <AuthProvider>
      <Avisos />
      <Router>
        <Seo />
        <ErrorBoundary fullScreen>
        <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/register-captain" element={<RegisterCaptain />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirmar" element={<ConfirmarAsistencia />} />
          <Route path="/sobre-nosotros" element={<SobreNosotros />} />
          <Route path="/centro-de-ayuda" element={<CentroDeAyuda />} />
          <Route path="/tutoriales" element={<Tutoriales />} />
          <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentes />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/terminos-de-servicio" element={<TerminosDeServicio />} />
          <Route path="/politica-de-privacidad" element={<PoliticaDePrivacidad />} />
          <Route path="/seguridad" element={<Seguridad />} />
          <Route path="/checkout" element={<Checkout />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/teams" element={<TeamSelection />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/players" element={<Players />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/matchmaking" element={<Matchmaking />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/inter-generaciones" element={<SoloInterGeneraciones />} />
              <Route path="/profile" element={<MyProfile />} />
              <Route path="/temporada" element={<Temporada />} />
              <Route path="/vote" element={<Vote />} />
              <Route path="/arena" element={<Arena />} />
              <Route path="/superadmin" element={<SuperAdmin />} />
              <Route element={<ProtectedRoute requireAdmin />}>
                <Route path="/admin" element={<AdminPlayers />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
