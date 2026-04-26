import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Players from './pages/Players';
import Calendar from './pages/Calendar';
import Matchmaking from './pages/Matchmaking';
import Finance from './pages/Finance';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import AdminPlayers from './pages/AdminPlayers';
import MyProfile from './pages/MyProfile';
import Vote from './pages/Vote';
import Landing from './pages/Landing';
import PaymentSuccess from './pages/PaymentSuccess';
import RegisterCaptain from './pages/RegisterCaptain';
import TeamSelection from './pages/TeamSelection';
import Arena from './pages/Arena';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/register-captain" element={<RegisterCaptain />} />
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/teams" element={<TeamSelection />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/players" element={<Players />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/matchmaking" element={<Matchmaking />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/settings" element={<Settings />} />
              {/* Future routes will go here */}
              <Route path="/admin" element={<AdminPlayers />} />
              <Route path="/profile" element={<MyProfile />} />
              <Route path="/vote" element={<Vote />} />
              <Route path="/arena" element={<Arena />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
