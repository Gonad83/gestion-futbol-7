import StaticLayout from '../components/StaticLayout';

const SECTIONS = [
  { title: '1. Aceptación de los términos', text: 'Al registrarte y usar MiClubPro, aceptas estos Términos de Servicio. Si no estás de acuerdo con alguna de las condiciones, no debes usar el servicio.' },
  { title: '2. Descripción del servicio', text: 'MiClubPro es una plataforma SaaS de gestión para equipos de Fútbol 7 que incluye administración de plantilla, calendario, control de asistencia, matchmaking, caja y votación MVP. El servicio se presta a través de internet y no requiere instalación.' },
  { title: '3. Registro y cuenta', text: 'Debes proporcionar información veraz al crear tu cuenta. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran bajo tu cuenta.' },
  { title: '4. Planes y pagos', text: 'MiClubPro ofrece un plan gratuito por 1 mes y planes de pago mensual y anual. Los pagos se procesan a través de Mercado Pago. No realizamos reembolsos por períodos ya utilizados.' },
  { title: '5. Uso aceptable', text: 'Te comprometes a no usar MiClubPro para actividades ilegales, enviar spam, suplantar identidades, ni intentar acceder a cuentas de otros usuarios. Nos reservamos el derecho de suspender cuentas que violen estas normas.' },
  { title: '6. Propiedad intelectual', text: 'MiClubPro y sus contenidos originales son propiedad de sus desarrolladores. No puedes reproducir, distribuir ni crear trabajos derivados sin autorización expresa.' },
  { title: '7. Limitación de responsabilidad', text: 'MiClubPro se provee "tal cual". No garantizamos disponibilidad continua. No somos responsables por pérdidas derivadas de interrupciones del servicio o errores en los datos.' },
  { title: '8. Modificaciones', text: 'Podemos actualizar estos términos en cualquier momento. Te notificaremos por email con al menos 15 días de anticipación ante cambios relevantes.' },
  { title: '9. Ley aplicable', text: 'Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa se resolverá en los tribunales competentes de Santiago de Chile.' },
];

export default function TerminosDeServicio() {
  return (
    <StaticLayout>
      <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
        style={{ background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }}>
        Legal
      </span>
      <h1 className="font-headline font-black text-4xl sm:text-5xl text-white mb-3 leading-tight">
        Términos de servicio
      </h1>
      <p className="text-sm mb-12" style={{ color: 'rgba(255,255,255,0.35)' }}>Última actualización: mayo 2025</p>

      <div className="space-y-6">
        {SECTIONS.map(s => (
          <div key={s.title} className="pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="font-headline font-bold text-lg text-white mb-3">{s.title}</h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>{s.text}</p>
          </div>
        ))}
      </div>
    </StaticLayout>
  );
}
