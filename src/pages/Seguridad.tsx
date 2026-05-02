import { Shield, Lock, Eye, Server } from 'lucide-react';
import StaticLayout from '../components/StaticLayout';

const ITEMS = [
  { icon: <Lock size={24} />, color: '#44f3a9', title: 'Cifrado extremo a extremo', desc: 'Todo el tráfico entre tu dispositivo y nuestros servidores está cifrado con TLS 1.3. Los datos almacenados usan AES-256.' },
  { icon: <Eye size={24} />, color: '#9acbff', title: 'Control de acceso por roles', desc: 'Capitanes y jugadores tienen accesos diferenciados. Un jugador nunca puede ver datos de otro equipo ni modificar información administrativa.' },
  { icon: <Server size={24} />, color: '#ffd08b', title: 'Infraestructura certificada', desc: 'Operamos sobre Supabase y AWS, con SOC 2 Type II. Los servidores están en regiones de América con backups automáticos diarios.' },
  { icon: <Shield size={24} />, color: '#44f3a9', title: 'Autenticación segura', desc: 'Usamos JWT con expiración, más recuperación de contraseña por email verificado. No almacenamos contraseñas en texto plano.' },
];

export default function Seguridad() {
  return (
    <StaticLayout>
      <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
        style={{ background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }}>
        Legal
      </span>
      <h1 className="font-headline font-black text-4xl sm:text-5xl text-white mb-4 leading-tight">
        Seguridad
      </h1>
      <p className="text-base mb-12" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Tu equipo y sus datos están protegidos con estándares de la industria.
      </p>

      <div className="space-y-5 mb-12">
        {ITEMS.map(item => (
          <div key={item.title} className="flex items-start gap-5 p-6 rounded-2xl"
            style={{ background: 'rgba(28,32,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="p-3 rounded-xl flex-shrink-0" style={{ background: item.color + '18', color: item.color }}>
              {item.icon}
            </div>
            <div>
              <p className="font-bold text-white text-base mb-2">{item.title}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, fontSize: 14 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl" style={{ background: 'rgba(68,243,169,0.07)', border: '1px solid rgba(68,243,169,0.15)' }}>
        <p className="font-bold text-white mb-2">¿Encontraste una vulnerabilidad?</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Reporta responsablemente a <span style={{ color: '#44f3a9' }}>seguridad@miclubpro.cl</span>. Respondemos en menos de 48 horas.
        </p>
      </div>
    </StaticLayout>
  );
}
