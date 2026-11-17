import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './landing.css';
import { PRECIOS, PREGUNTAS_PORTADA as PREGUNTAS } from '../lib/contenidoPublico';

// Los jugadores, el rival y los montos de la caja son de ejemplo: solo muestran
// cómo se ve la app. Los precios de los planes sí son los reales y deben
// salir de contenidoPublico.ts, igual que en Checkout.tsx.

type Estado = 'va' | 'falta' | 'no';
type Posicion = 'ARQ' | 'DEF' | 'MED' | 'DEL';
type Jugador = { n: string; p: Posicion; r: number };
type Ciclo = 'mensual' | 'anual';

const TOTAL = 14;
const CONFIRMADOS_INICIO = 9;
const ASISTENCIA: { n: string; e: Estado }[] = [
  { n: 'Carlos Rojas', e: 'va' },
  { n: 'Marco Fuentes', e: 'falta' },
  { n: 'Pablo Lagos', e: 'falta' },
  { n: 'Rodrigo Vera', e: 'no' },
];
const ETIQUETA: Record<Estado, string> = { va: 'Va', falta: 'Confirmar', no: 'No va' };

const JUGADORES: Jugador[] = [
  { n: 'Carlos Rojas', p: 'ARQ', r: 4 },
  { n: 'Gabriel Herrera', p: 'ARQ', r: 3 },
  { n: 'Diego García', p: 'DEF', r: 5 },
  { n: 'Andrés Bravo', p: 'DEF', r: 3 },
  { n: 'Nicolás Kramm', p: 'DEF', r: 4 },
  { n: 'Tomás Pizarro', p: 'DEF', r: 2 },
  { n: 'Marco Fuentes', p: 'MED', r: 5 },
  { n: 'Pablo Lagos', p: 'MED', r: 3 },
  { n: 'Walter Ríos', p: 'MED', r: 4 },
  { n: 'Sergio Muñoz', p: 'MED', r: 2 },
  { n: 'Rodrigo Vera', p: 'DEL', r: 5 },
  { n: 'Luis Barra', p: 'DEL', r: 3 },
  { n: 'Felipe Orellana', p: 'DEL', r: 4 },
  { n: 'Ignacio Soto', p: 'DEL', r: 2 },
];
const POSICIONES: Posicion[] = ['ARQ', 'DEF', 'MED', 'DEL'];
const NOMBRE_POS: Record<Posicion, string> = { ARQ: 'Arqueros', DEF: 'Defensas', MED: 'Medios', DEL: 'Delanteros' };

const iniciales = (n: string) => n.split(' ').map(p => p[0]).join('').slice(0, 2);
const apellido = (n: string) => n.split(' ').slice(1).join(' ');
const suma = (eq: Jugador[]) => eq.reduce((t, j) => t + j.r, 0);
const promedio = (eq: Jugador[]) => (suma(eq) / eq.length).toFixed(1).replace('.', ',');

// Reparte por posición (cada equipo con su arquero, defensas, etc.) y, dentro de
// cada posición, del mejor al más bajo hacia el equipo que va perdiendo en nivel.
function armarEquipos(): [Jugador[], Jugador[]] {
  const a: Jugador[] = [];
  const b: Jugador[] = [];
  const tope = Math.ceil(JUGADORES.length / 2);
  const mezclados = JUGADORES.map(j => ({ j, azar: Math.random() })).sort((x, y) => x.azar - y.azar).map(x => x.j);
  const ordenados = mezclados.sort((x, y) => POSICIONES.indexOf(x.p) - POSICIONES.indexOf(y.p) || y.r - x.r);
  for (const j of ordenados) {
    const enPos = (eq: Jugador[]) => eq.filter(k => k.p === j.p).length;
    let destino: Jugador[];
    if (a.length >= tope) destino = b;
    else if (b.length >= tope) destino = a;
    else if (enPos(a) !== enPos(b)) destino = enPos(a) < enPos(b) ? a : b;
    else if (suma(a) !== suma(b)) destino = suma(a) < suma(b) ? a : b;
    else destino = Math.random() < 0.5 ? a : b;
    destino.push(j);
  }
  return [a, b];
}

const NOTA_MENSUAL = 'Pago mes a mes, sin permanencia';

const FOTO = (id: string, ancho: number) => `https://images.unsplash.com/photo-${id}?w=${ancho}&q=72&auto=format&fit=crop`;

export default function Landing() {
  const raiz = useRef<HTMLDivElement>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [asistencia, setAsistencia] = useState(ASISTENCIA);
  const [equipos, setEquipos] = useState<[Jugador[], Jugador[]] | null>(null);
  const [ciclo, setCiclo] = useState<Ciclo>('anual');
  const [registro, setRegistro] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', teamName: '' });
  const [aviso, setAviso] = useState('');

  const confirmados = CONFIRMADOS_INICIO + asistencia.filter((j, i) => j.e === 'va' && ASISTENCIA[i].e === 'falta').length;
  const faltan = asistencia.some(j => j.e === 'falta');

  // Aparición al bajar. Si el navegador no tiene IntersectionObserver, todo queda visible.
  useEffect(() => {
    const nodo = raiz.current;
    if (!nodo || !('IntersectionObserver' in window)) return;
    nodo.classList.add('lp-js');
    const ojo = new IntersectionObserver(entradas => {
      entradas.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('visto');
        ojo.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    nodo.querySelectorAll('[data-rev]').forEach(el => ojo.observe(el));
    return () => ojo.disconnect();
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    if (!registro) return;
    const cerrar = (e: KeyboardEvent) => { if (e.key === 'Escape') setRegistro(false); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [registro]);

  const diferencia = useMemo(() => (equipos ? Math.abs(suma(equipos[0]) - suma(equipos[1])) : 0), [equipos]);

  const confirmar = (i: number) => setAsistencia(lista => lista.map((j, k) => (k === i && j.e === 'falta' ? { ...j, e: 'va' } : j)));

  const copiar = async () => {
    if (!equipos) return;
    const bloque = (nombre: string, eq: Jugador[]) => `*${nombre}*\n${eq.map(j => `• ${j.n} (${j.p})`).join('\n')}`;
    const texto = `⚽ Viernes 21:00 · Cancha Norte\n\n${bloque('Equipo A', equipos[0])}\n\n${bloque('Equipo B', equipos[1])}`;
    try {
      await navigator.clipboard.writeText(texto);
      setAviso('Lista copiada: pégala en el grupo');
    } catch {
      setAviso('No se pudo copiar desde este navegador');
    }
  };

  const crearEquipo = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ plan: 'free', email: form.email, name: form.name, team: form.teamName, status: 'approved' });
    window.location.href = `/register-captain?${params.toString()}`;
  };

  const mitad = (eq: Jugador[]) => {
    let k = 0;
    return POSICIONES.map(p => (
      <ul className="linea" aria-label={NOMBRE_POS[p]} key={p}>
        {eq.filter(j => j.p === p).map(j => (
          <li className="ficha" style={{ animationDelay: `${(k++) * 45}ms` }} key={j.n}>
            <span className="cam">{iniciales(j.n)}</span>
            <span className="fn">{apellido(j.n)}</span>
            <span className="fniv">{j.p} ★{j.r}</span>
          </li>
        ))}
      </ul>
    ));
  };

  const BotonGratis = ({ clase = 'btn btn-verde' }: { clase?: string }) => (
    <button type="button" className={clase} onClick={() => { setMenuAbierto(false); setRegistro(true); }}>Crear mi equipo gratis</button>
  );

  return (
    <div className="lp" ref={raiz}>
      <header className="nav" id="inicio">
        <a className="marca" href="#inicio" aria-label="MiClubPro, inicio">
          <img src="/logo.png" alt="Logo de MiClubPro" width={30} height={30} />
          <span>MiClub<b>Pro</b></span>
        </a>
        <button className="nav-btn" type="button" aria-expanded={menuAbierto} aria-controls="menu" aria-label="Abrir menú" onClick={() => setMenuAbierto(v => !v)}><i /><i /><i /></button>
        <nav className={`menu${menuAbierto ? ' abierto' : ''}`} id="menu" aria-label="Principal" onClick={e => { if ((e.target as HTMLElement).closest('a')) setMenuAbierto(false); }}>
          <a href="#armado">Pruébalo</a>
          <a href="#features">Funciones</a>
          <a href="#how-it-works">Cómo funciona</a>
          <a href="#pricing">Precios</a>
          <a href="#preguntas">Preguntas</a>
          <Link className="menu-entrar" to="/login">Ingresar</Link>
          <BotonGratis clase="btn btn-verde btn-ch" />
        </nav>
      </header>

      <main>
        <section className="hero">
          <h1>Deja de perseguir a tu equipo <em>por WhatsApp.</em></h1>
          <div className="hero-pie">
            <div className="hero-txt">
              <p className="bajada">MiClubPro es la app para organizar tu equipo de fútbol 7: asistencia confirmada, equipos parejos y cuotas al día antes de cada partido. Desde el celular, sin instalar nada.</p>
              <div className="acciones">
                <BotonGratis />
                <a className="btn btn-linea" href="#armado">Probar el armado</a>
              </div>
            </div>
            <figure className="hero-foto">
              <img src={FOTO('1632300951015-42d7df909581', 1500)} alt="Partido de fútbol amateur en cancha sintética al atardecer, visto desde la reja" width={1500} height={844} fetchPriority="high" />
            </figure>
            <div className="partido" aria-label="Ejemplo interactivo de confirmación de asistencia">
              <p className="par-rot">Próximo partido</p>
              <p className="par-tit">vs. Los Leones FC</p>
              <p className="par-dato">Viernes, 21:00. Cancha Norte</p>
              <p className="par-cuenta"><strong><span>{confirmados}</span>/{TOTAL}</strong> confirmados</p>
              <div className="pips" aria-hidden="true">
                {Array.from({ length: TOTAL }, (_, i) => <i className={i < confirmados ? 'on' : ''} key={i} />)}
              </div>
              <ul className="lista">
                {asistencia.map((j, i) => (
                  <li key={j.n}>
                    <button type="button" disabled={j.e !== 'falta'} onClick={() => confirmar(i)}>
                      <span className="nom">{j.n}</span>
                      <span className={`chip ${j.e}`}>{ETIQUETA[j.e]}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="par-pista">{faltan ? 'Toca a los que faltan para confirmarlos' : 'Listo: ya sabes con quién cuentas'}</p>
            </div>
          </div>
        </section>

        <section className="bloque problema">
          <h2 data-rev>Un grupo de WhatsApp no organiza un equipo.</h2>
          <div className="prob-grid">
            <div className="chat" aria-label="Así se coordina hoy" data-rev>
              <p className="glo"><b>Nico</b>¿Quién va el viernes?</p>
              <p className="glo"><b>Pablo</b>yo</p>
              <p className="glo"><b>Tomás</b>yo +1</p>
              <p className="glo"><b>Sergio</b>depende de la pega</p>
              <p className="glo"><b>Lucho</b>¿a qué hora era?</p>
              <p className="glo mio">¿Alguien pagó la cancha?</p>
              <p className="glo"><b>Pablo</b>👍</p>
              <p className="glo"><b>Nico</b>¿somos 13 o 14?</p>
            </div>
            <div className="orden" aria-label="Así queda con MiClubPro" data-rev>
              <p className="orden-tit">El mismo viernes, en MiClubPro</p>
              <dl>
                <div><dt>9/14</dt><dd>confirmados, con nombre y apellido</dd></div>
                <div><dt>7 vs 7</dt><dd>equipos armados por nivel y posición</dd></div>
                <div><dt>2</dt><dd>cuotas pendientes, y sabes de quién</dd></div>
              </dl>
              <p className="orden-nota">Cada jugador confirma con un clic desde su correo. Tú solo miras el número.</p>
            </div>
          </div>
        </section>

        <section className="pasto" id="armado">
          <div className="pasto-in">
            <h2>Arma dos equipos parejos en un clic.</h2>
            <p className="cab-p">Estos 14 jugadores son de ejemplo. El sistema los reparte por nivel y posición para que nadie reclame.</p>
            <div className="arm-barra">
              <button className="btn btn-claro" type="button" onClick={() => setEquipos(armarEquipos())}>{equipos ? 'Mezclar de nuevo' : 'Armar equipos'}</button>
              {equipos && <button className="btn btn-linea-claro" type="button" onClick={copiar}>Copiar para WhatsApp</button>}
            </div>
            {!equipos && (
              <div className="pozo">
                {POSICIONES.map(p => (
                  <div className="grupo" key={p}>
                    <h3>{NOMBRE_POS[p]}</h3>
                    <ul>{JUGADORES.filter(j => j.p === p).map(j => <li key={j.n}><span>{j.n}</span><b>★{j.r}</b></li>)}</ul>
                  </div>
                ))}
              </div>
            )}
            {equipos && (
              <div className="equipos">
                <div className="eq-cab">
                  <p><b>Equipo A</b><span>Nivel ★{promedio(equipos[0])}</span></p>
                  <p><b>Equipo B</b><span>Nivel ★{promedio(equipos[1])}</span></p>
                </div>
                <div className="cancha">
                  <div className="mitad mitad-a">{mitad(equipos[0])}</div>
                  <div className="mitad mitad-b">{mitad(equipos[1])}</div>
                </div>
              </div>
            )}
            <p className="arm-nota" aria-live="polite">
              {equipos && (diferencia === 0
                ? 'Quedaron con el mismo nivel total y un arquero por lado.'
                : `Diferencia de nivel total: ${diferencia} punto${diferencia === 1 ? '' : 's'}, con un arquero por lado.`)}
            </p>
          </div>
        </section>

        <section className="bloque" id="features">
          <h2 data-rev>La caja, el MVP y el calendario también quedan ordenados.</h2>
          <div className="func-grid">
            <article className="f-caja" data-rev>
              <div>
                <h3>Caja clara y morosos a la vista</h3>
                <p>Registras cuotas, ingresos y gastos. Ves quién está al día y quién debe, sin planillas ni conversaciones incómodas.</p>
              </div>
              <div className="caja-demo" aria-label="Ejemplo de caja">
                <p className="caja-tit"><span>Cuota de noviembre</span><b>$60.000 de $70.000</b></p>
                <ul>
                  <li><span>Carlos Rojas</span><b className="ok">Pagó</b></li>
                  <li><span>Diego García</span><b className="ok">Pagó</b></li>
                  <li><span>Marco Fuentes</span><b className="debe">Debe $5.000</b></li>
                  <li><span>Pablo Lagos</span><b className="debe">Debe $5.000</b></li>
                </ul>
                <p className="caja-pie">12 de 14 al día</p>
              </div>
            </article>
            <article className="f-mvp" data-rev>
              <img src={FOTO('1697111820775-4b5a28d7a3f3', 900)} alt="Jugador amateur rematando de volea en una cancha sintética" width={900} height={600} loading="lazy" />
              <div>
                <h3>Votación MVP</h3>
                <p>Después de cada partido el equipo vota al mejor. El ranking queda guardado toda la temporada.</p>
              </div>
            </article>
            <article className="f-min" data-rev><h3>Calendario</h3><p>Partidos, eventos y cumpleaños del plantel en un solo lugar.</p></article>
            <article className="f-min" data-rev><h3>Estadísticas</h3><p>Partidos jugados y asistencia de cada jugador.</p></article>
            <article className="f-min" data-rev><h3>Plantilla</h3><p>Foto, posición, apodo, nivel y estado de cada uno.</p></article>
            <article className="f-min" data-rev><h3>Roles</h3><p>El capitán administra. Los jugadores confirman y votan.</p></article>
          </div>
        </section>

        <section className="bloque" id="how-it-works">
          <div className="como-grid">
            <figure className="como-foto" data-rev>
              <img src={FOTO('1752681304960-bd4e018a04bb', 900)} alt="Equipo de fútbol abrazado en círculo antes de empezar el partido" width={900} height={1125} loading="lazy" />
            </figure>
            <div>
              <h2 data-rev>Listo en cinco minutos.</h2>
              <ol className="pasos">
                <li data-rev><h3>Crea tu equipo</h3><p>Te registras con tu correo, le pones nombre y logo.</p></li>
                <li data-rev><h3>Suma a tus jugadores</h3><p>Compartes el link de invitación o los agregas tú con posición y nivel.</p></li>
                <li data-rev><h3>Agenda el partido</h3><p>Fecha, hora y cancha. Los correos de confirmación salen solos.</p></li>
                <li data-rev><h3>Arma y juega</h3><p>Generas los equipos, pegas la lista en el grupo y anotas las cuotas.</p></li>
              </ol>
            </div>
          </div>
        </section>

        <section className="bloque" id="pricing">
          <div className="pre-cab">
            <div>
              <h2 data-rev>Un plan por equipo, no por jugador.</h2>
              <p className="cab-p">Con el plantel completo, el plan Pro sale menos de $750 por jugador al mes.</p>
            </div>
            <div className="periodo" role="group" aria-label="Forma de pago">
              <button type="button" className={ciclo === 'mensual' ? 'activo' : ''} onClick={() => setCiclo('mensual')}>Mensual</button>
              <button type="button" className={ciclo === 'anual' ? 'activo' : ''} onClick={() => setCiclo('anual')}>Anual <small>20% menos</small></button>
            </div>
          </div>
          <div className="planes">
            <article className="plan" data-rev>
              <h3>Starter</h3>
              <p className="plan-para">Para probarlo con tu equipo</p>
              <p className="precio"><strong>$0</strong></p>
              <p className="plan-nota">1 mes completo, sin tarjeta</p>
              <BotonGratis clase="btn btn-linea" />
              <ul>
                <li>1 equipo, 10 jugadores y 4 invitados</li>
                <li>Confirmación de asistencia por correo</li>
                <li>Armado automático de equipos</li>
                <li>Caja: cuotas y gastos</li>
                <li>Votación MVP</li>
                <li>Exporta a WhatsApp</li>
              </ul>
            </article>
            <article className="plan plan-top" data-rev>
              <h3>Pro</h3>
              <p className="plan-para">1 equipo, hasta 14 jugadores</p>
              <p className="precio"><strong>{PRECIOS.pro[ciclo]}</strong><span>/mes</span></p>
              <p className="plan-nota">{ciclo === 'anual' ? PRECIOS.pro.notaAnual : NOTA_MENSUAL}</p>
              <a className="btn btn-verde" href={`/checkout?plan=pro&cycle=${ciclo}`}>Empezar con Pro</a>
              <ul>
                <li>Titulares y suplentes: hasta 14</li>
                <li>Armado por posición y nivel</li>
                <li>Confirmación automática por correo</li>
                <li>Caja con morosos al instante</li>
                <li>Estadísticas de asistencia por jugador</li>
                <li>Soporte por WhatsApp en horario hábil</li>
              </ul>
            </article>
            <article className="plan" data-rev>
              <h3>Elite</h3>
              <p className="plan-para">Para quien maneja una liga</p>
              <p className="precio"><strong>{PRECIOS.elite[ciclo]}</strong><span>/mes</span></p>
              <p className="plan-nota">{ciclo === 'anual' ? PRECIOS.elite.notaAnual : NOTA_MENSUAL}</p>
              <a className="btn btn-linea" href={`/checkout?plan=elite&cycle=${ciclo}`}>Empezar con Elite</a>
              <ul>
                <li>Todo lo del plan Pro</li>
                <li>Jugadores ilimitados</li>
                <li>Toda tu liga en un solo panel</li>
                <li>Ranking MVP histórico del torneo</li>
                <li>Arena: cruces y fixtures automáticos</li>
                <li>Soporte prioritario</li>
              </ul>
            </article>
          </div>
          <p className="pre-pie">Valores en pesos chilenos. Sin contrato: cambias de plan o cancelas cuando quieras.</p>
        </section>

        <section className="bloque" id="preguntas">
          <div className="faq-grid">
            <h2 data-rev>Antes de empezar.</h2>
            <div className="faq">
              {PREGUNTAS.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
            </div>
          </div>
        </section>

        <section className="cierre">
          <img src={FOTO('1711447395363-5595964fd7ab', 1800)} alt="" width={1800} height={1200} loading="lazy" />
          <div className="cierre-in">
            <h2><span>El viernes se juega.</span> Que lo demás esté listo el jueves.</h2>
            <div className="acciones">
              <BotonGratis />
              <Link className="btn btn-linea-claro" to="/contacto">Hablar con nosotros</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="pie">
        <div className="pie-marca">
          <span className="marca"><span>MiClub<b>Pro</b></span></span>
          <p>Gestión para equipos de fútbol 7 en Chile.</p>
        </div>
        <nav aria-label="Pie">
          <Link to="/sobre-nosotros">Sobre nosotros</Link>
          <Link to="/tutoriales">Tutoriales</Link>
          <Link to="/centro-de-ayuda">Centro de ayuda</Link>
          <Link to="/preguntas-frecuentes">Preguntas frecuentes</Link>
          <Link to="/contacto">Contacto</Link>
          <Link to="/terminos-de-servicio">Términos</Link>
          <Link to="/politica-de-privacidad">Privacidad</Link>
          <Link to="/seguridad">Seguridad</Link>
        </nav>
        <p className="pie-legal">© 2026 MiClubPro.cl</p>
      </footer>

      {registro && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="registro-titulo" onClick={e => { if (e.target === e.currentTarget) setRegistro(false); }}>
          <div className="modal-caja">
            <button className="modal-x" type="button" aria-label="Cerrar" onClick={() => setRegistro(false)}>×</button>
            <h2 id="registro-titulo">Crea tu equipo</h2>
            <p>Un mes gratis, sin tarjeta de crédito.</p>
            <form onSubmit={crearEquipo}>
              <label>Nombre completo
                <input type="text" required autoFocus autoComplete="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </label>
              <label>Correo
                <input type="email" required autoComplete="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </label>
              <label>Nombre del equipo
                <input type="text" required value={form.teamName} onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))} />
              </label>
              <button className="btn btn-verde" type="submit">Crear cuenta gratis</button>
            </form>
          </div>
        </div>
      )}

      <div className={`aviso-flotante${aviso ? ' ver' : ''}`} role="status" aria-live="polite">{aviso}</div>
    </div>
  );
}
