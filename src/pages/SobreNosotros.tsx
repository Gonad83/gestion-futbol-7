import StaticLayout from '../components/StaticLayout';

export default function SobreNosotros() {
  return (
    <StaticLayout>
      <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
        style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
        Nuestra historia
      </span>
      <h1 className="font-headline font-black text-4xl sm:text-5xl text-white mb-6 leading-tight">
        Nacimos jugando<br /><span style={{ color: '#44f3a9' }}>fútbol 7</span>
      </h1>
      <p className="text-lg mb-12" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>
        MiClubPro nació de una frustración real: coordinar un equipo de fútbol 7 cada semana era un caos de WhatsApp, planillas de Excel y cobros informales. Decidimos construir la herramienta que siempre quisimos tener.
      </p>

      {[
        {
          title: 'Nuestra misión',
          color: '#44f3a9',
          text: 'Simplificar la gestión de equipos amateur para que los capitanes puedan enfocarse en lo que importa: jugar fútbol. Queremos que cada equipo de Fútbol 7 tenga acceso a herramientas profesionales sin complicaciones.',
        },
        {
          title: 'Quiénes somos',
          color: '#9acbff',
          text: 'Somos un equipo pequeño de desarrolladores y futboleros apasionados, basados en Chile. Construimos MiClubPro para nuestra propia liga — y decidimos abrirlo para todos.',
        },
        {
          title: 'Nuestros valores',
          color: '#ffd08b',
          text: 'Simplicidad por sobre todo. Transparencia en precios y datos. Diseño pensado para el celular. Soporte real de personas reales. Y siempre, primero el fútbol.',
        },
      ].map(item => (
        <div key={item.title} className="mb-8 p-6 rounded-2xl" style={{ background: 'rgba(28,32,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-8 h-0.5 mb-4" style={{ background: item.color }} />
          <h2 className="font-headline font-bold text-xl text-white mb-3">{item.title}</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.75 }}>{item.text}</p>
        </div>
      ))}
    </StaticLayout>
  );
}
