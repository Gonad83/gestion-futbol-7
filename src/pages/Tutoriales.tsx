import StaticLayout from '../components/StaticLayout';

const TUTORIALS = [
  {
    num: '01', color: '#44f3a9',
    title: 'Crear tu equipo',
    steps: ['Regístrate en MiClubPro con tu email', 'Ingresa el nombre de tu equipo y elige un logo', 'Copia el link de invitación y compártelo con tus jugadores'],
  },
  {
    num: '02', color: '#9acbff',
    title: 'Agregar jugadores',
    steps: ['Ve a la sección "Plantilla"', 'Haz clic en "Nuevo jugador"', 'Completa nombre, posición y rating (1-5 estrellas)', 'El jugador recibirá un email de bienvenida'],
  },
  {
    num: '03', color: '#ffd08b',
    title: 'Crear un partido y confirmar asistencia',
    steps: ['Ve al Calendario y haz clic en "Nuevo evento"', 'Ingresa fecha, hora, lugar y tipo (Deportivo / Recreacional)', 'El sistema envía emails automáticos a todos los jugadores', 'Cada jugador confirma con un clic desde su email'],
  },
  {
    num: '04', color: '#44f3a9',
    title: 'Armar equipos con Matchmaking',
    steps: ['Ve a "Matchmaking" y selecciona el partido', 'Verifica quiénes confirmaron asistencia', 'Haz clic en "Generar equipos"', 'Revisa los equipos y exporta la lista a WhatsApp'],
  },
  {
    num: '05', color: '#9acbff',
    title: 'Registrar cuotas y pagos',
    steps: ['Ve a "Caja" y selecciona el período', 'Haz clic en "Registrar pago" junto al jugador', 'Ingresa el monto y confirma', 'El panel muestra al instante quiénes están al día y quiénes deben'],
  },
];

export default function Tutoriales() {
  return (
    <StaticLayout>
      <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
        style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
        Guías paso a paso
      </span>
      <h1 className="font-headline font-black text-4xl sm:text-5xl text-white mb-4 leading-tight">
        Tutoriales
      </h1>
      <p className="text-base mb-12" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Aprende a usar MiClubPro en minutos con estas guías.
      </p>

      <div className="space-y-6">
        {TUTORIALS.map(t => (
          <div key={t.num} className="p-6 rounded-2xl" style={{ background: 'rgba(28,32,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="font-headline font-black text-3xl" style={{ color: t.color, opacity: 0.4 }}>{t.num}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <h2 className="font-headline font-bold text-lg text-white">{t.title}</h2>
            </div>
            <ol className="space-y-3">
              {t.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5"
                    style={{ background: t.color + '22', color: t.color }}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </StaticLayout>
  );
}
