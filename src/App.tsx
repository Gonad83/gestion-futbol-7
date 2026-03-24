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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/players" element={<Players />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/matchmaking" element={<Matchmaking />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/settings" element={<Settings />} />
              {/* Future routes will go here */}
              <Route path="/admin" element={<AdminPlayers />} />
              <Route path="/profile" element={<MyProfile />} />
              <Route path="/vote" element={<Vote />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
