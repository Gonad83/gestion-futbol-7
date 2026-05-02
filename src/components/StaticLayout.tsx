import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function StaticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#10141a', minHeight: '100vh', fontFamily: 'Manrope, sans-serif', color: '#fff' }}>
      <nav style={{ background: 'rgba(10,14,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
        className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="MiClubPro" className="w-8 h-8 object-contain" />
          <span className="font-headline font-black text-white text-base uppercase tracking-tight">MiClubPro</span>
        </Link>
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold transition-colors"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#44f3a9')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
          <ArrowLeft size={15} /> Volver al inicio
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {children}
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} className="px-6 py-6 text-center">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>© 2025 MiClubPro.cl · Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
