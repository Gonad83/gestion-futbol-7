import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

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
const Vote = lazy(() => import('./pages/Vote'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const RegisterCaptain = lazy(() => import('./pages/RegisterCaptain'));
const TeamSelection = lazy(() => import('./pages/TeamSelection'));
const Arena = lazy(() => import('./pages/Arena'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ConfirmarAsistencia = lazy(() => import('./pages/ConfirmarAsistencia'));
const SobreNosotros = lazy(() => import('./pages/SobreNosotros'));
const CentroDeAyuda = lazy(() => import('./pages/CentroDeAyuda'));
const Tutoriales = lazy(() => import('./pages/Tutoriales'));
const PreguntasFrecuentes = lazy(() => import('./pages/PreguntasFrecuentes'));
const Contacto = lazy(() => import('./pages/Contacto'));
const TerminosDeServicio = lazy(() => import('./pages/TerminosDeServicio'));
const PoliticaDePrivacidad = lazy(() => import('./pages/PoliticaDePrivacidad'));
const Seguridad = lazy(() => import('./pages/Seguridad'));
const Checkout = lazy(() => import('./pages/Checkout'));
import Landing from './pages/Landing';

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

function Inicio() {
  const { user } = useAuth();
  if (user || haySesionGuardada()) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
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
              {/* Future routes will go here */}
              <Route path="/profile" element={<MyProfile />} />
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
      </Router>
    </AuthProvider>
  );
}

export default App;
