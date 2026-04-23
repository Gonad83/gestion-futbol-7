import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();

  const [showSlowMessage, setShowSlowMessage] = React.useState(false);

  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSlowMessage(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dark-bg p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-soccer-green mb-4"></div>
        {showSlowMessage && (
          <div className="fade-in">
            <p className="text-slate-400 mb-2">Cargando datos del servidor...</p>
            <p className="text-xs text-slate-500 max-w-xs">Si la carga tarda demasiado, revisa tu conexión a internet o intenta refrescar la página.</p>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    // If admin is required but user is not admin, redirect to normal dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
