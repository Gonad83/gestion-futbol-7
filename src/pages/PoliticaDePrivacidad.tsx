import StaticLayout from '../components/StaticLayout';

const SECTIONS = [
  { title: '¿Qué datos recopilamos?', text: 'Recopilamos el nombre, email y nombre del equipo al registrarte. Durante el uso, almacenamos datos de jugadores (nombre, posición, rating), eventos del calendario, registros de asistencia y transacciones de caja que tú mismo ingresas.' },
  { title: '¿Para qué usamos tus datos?', text: 'Tus datos se usan exclusivamente para operar el servicio: enviar emails de confirmación de asistencia, procesar pagos, generar estadísticas de tu equipo y mejorar la plataforma. Nunca vendemos ni compartimos datos con terceros con fines comerciales.' },
  { title: 'Emails automáticos', text: 'MiClubPro envía emails transaccionales a los jugadores de tu equipo (confirmaciones de asistencia, recordatorios de partido). Estos emails solo se envían cuando el capitán crea un evento. Los jugadores pueden solicitar ser removidos contactando a hola@miclubpro.cl.' },
  { title: 'Almacenamiento y seguridad', text: 'Los datos se almacenan en Supabase (infraestructura en AWS) con cifrado TLS en tránsito y AES-256 en reposo. Aplicamos control de acceso por roles para que cada usuario solo vea los datos de su equipo.' },
  { title: 'Cookies', text: 'Usamos únicamente cookies esenciales para mantener tu sesión activa. No utilizamos cookies de seguimiento ni publicidad.' },
  { title: 'Tus derechos', text: 'Tienes derecho a acceder, corregir y eliminar tus datos en cualquier momento. Para solicitar la eliminación completa de tu cuenta y datos, escríbenos a hola@miclubpro.cl.' },
  { title: 'Retención de datos', text: 'Si cancelas tu cuenta, tus datos se conservan por 90 días antes de ser eliminados definitivamente, por si deseas reactivarla.' },
  { title: 'Contacto', text: 'Para consultas sobre privacidad, escríbenos a hola@miclubpro.cl o por WhatsApp en horario hábil.' },
];

export default function PoliticaDePrivacidad() {
  return (
    <StaticLayout>
      <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
        style={{ background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }}>
        Legal
      </span>
      <h1 className="font-headline font-black text-4xl sm:text-5xl text-white mb-3 leading-tight">
        Política de privacidad
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
