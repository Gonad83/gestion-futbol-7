/**
 * Programa del Inter Generaciones: grupos sorteados y calendario de partidos.
 * Sale del programa oficial que publica la organización (un PDF por año), así
 * que se carga aquí por edición.
 */

export const NOSOTROS = 'Real Ebolo';

type Equipo = { nombre: string; generacion: number };
type Grupo = { nombre: string; equipos: Equipo[] };

/** Un partido de grupo tiene local y visita; los de copa solo una descripción. */
export type Partido = {
  codigo: string;
  local?: string;
  visita?: string;
  texto?: string;
  copa?: 'oro' | 'plata';
};

type Bloque =
  | { hora: string; cancha1?: Partido; cancha2?: Partido }
  | { hora: string; pausa: string; nota?: string; fiesta?: boolean };

type Dia = { titulo: string; resumen: string; bloques: Bloque[] };

export type Programa = {
  fechas: string;
  minutos: number;
  grupos: Grupo[];
  dias: Dia[];
  formato: { titulo: string; texto: string; copa: 'oro' | 'plata' }[];
  reglaCentral: string;
  reglas: { titulo: string; puntos: string[] }[];
};

const g = (codigo: string, local: string, visita: string): Partido => ({ codigo, local, visita });
const c = (codigo: string, texto: string, copa: 'oro' | 'plata'): Partido => ({ codigo, texto, copa });

export const PROGRAMAS: Record<number, Programa> = {
  2026: {
    fechas: 'Viernes 4 y sábado 5 de diciembre',
    minutos: 45,
    grupos: [
      {
        nombre: 'Grupo A',
        equipos: [
          { nombre: 'Deportes Croto', generacion: 2020 },
          { nombre: 'G16', generacion: 2016 },
          { nombre: 'Real Ebolo', generacion: 2002 },
          { nombre: 'Centenario FC', generacion: 2011 },
        ],
      },
      {
        nombre: 'Grupo B',
        equipos: [
          { nombre: 'Equipo Malo', generacion: 2008 },
          { nombre: 'Salón Mario Illanes FC', generacion: 2019 },
          { nombre: 'Confras 2024', generacion: 2024 },
          { nombre: 'AC Sed', generacion: 1996 },
        ],
      },
      {
        nombre: 'Grupo C',
        equipos: [
          { nombre: "La D'Quince", generacion: 2015 },
          { nombre: 'Arsenalgas', generacion: 2013 },
          { nombre: 'Emmanuelson', generacion: 2023 },
          { nombre: 'Generación 2026', generacion: 2026 },
        ],
      },
    ],
    dias: [
      {
        titulo: 'Viernes 4 de diciembre',
        resumen: '10 partidos · Grupos',
        bloques: [
          { hora: '19:00–19:45', cancha1: g('P1', "La D'Quince", 'Generación 2026'), cancha2: g('P2', 'Deportes Croto', 'Centenario FC') },
          { hora: '19:45–20:30', cancha1: g('P3', 'Arsenalgas', 'Emmanuelson'), cancha2: g('P4', 'G16', 'Real Ebolo') },
          { hora: '20:30–21:15', cancha1: g('P5', 'Equipo Malo', 'AC Sed'), cancha2: g('P6', 'Salón Mario Illanes FC', 'Confras 2024') },
          { hora: '21:15–22:00', cancha1: g('P7', "La D'Quince", 'Emmanuelson'), cancha2: g('P8', 'Generación 2026', 'Arsenalgas') },
          { hora: '22:00–22:45', cancha1: g('P9', 'Deportes Croto', 'Real Ebolo'), cancha2: g('P10', 'Centenario FC', 'G16') },
        ],
      },
      {
        titulo: 'Sábado 5 de diciembre',
        resumen: '18 partidos · Grupos y copas',
        bloques: [
          { hora: '09:00–09:45', cancha1: g('P11', 'Equipo Malo', 'Confras 2024'), cancha2: g('P12', 'AC Sed', 'Salón Mario Illanes FC') },
          { hora: '09:45–10:30', cancha1: g('P13', "La D'Quince", 'Arsenalgas'), cancha2: g('P14', 'Emmanuelson', 'Generación 2026') },
          { hora: '10:30–11:15', cancha1: g('P15', 'Deportes Croto', 'G16'), cancha2: g('P16', 'Real Ebolo', 'Centenario FC') },
          { hora: '11:15–12:00', cancha1: g('P17', 'Equipo Malo', 'Salón Mario Illanes FC'), cancha2: g('P18', 'Confras 2024', 'AC Sed') },
          { hora: '12:00–13:00', pausa: 'Descanso general', nota: '1 hora' },
          { hora: '13:00–13:45', cancha1: c('Q1', '1.º vs 8.º', 'oro'), cancha2: c('Q2', '4.º vs 5.º', 'oro') },
          { hora: '13:45–14:30', cancha1: c('Q3', '2.º vs 7.º', 'oro'), cancha2: c('Q4', '3.º vs 6.º', 'oro') },
          { hora: '14:30–15:15', cancha1: c('SP1', 'Plata 1 vs Plata 4', 'plata'), cancha2: c('SP2', 'Plata 2 vs Plata 3', 'plata') },
          { hora: '15:15–16:00', cancha1: c('S1', 'Ganador Q1 vs Q2', 'oro'), cancha2: c('S2', 'Ganador Q3 vs Q4', 'oro') },
          { hora: '16:00–16:30', pausa: 'Pausa antes de finales', nota: '30 minutos' },
          { hora: '16:30–17:15', cancha1: c('FP', 'Final Copa Plata', 'plata') },
          { hora: '17:15–18:00', cancha1: c('FO', 'Final Copa Oro', 'oro') },
          { hora: '21:30', pausa: 'Fiesta de premiación', fiesta: true },
        ],
      },
    ],
    formato: [
      { titulo: 'Copa Oro · 8 equipos', texto: 'El 1.º y 2.º de cada grupo, más los 2 mejores terceros.', copa: 'oro' },
      { titulo: 'Copa Plata · 4 equipos', texto: 'El peor tercero, más los 3 equipos que terminan cuartos.', copa: 'plata' },
    ],
    reglaCentral: 'Los cupos se definen por grupo; el ranking ordena a los 8 clasificados.',
    reglas: [
      {
        titulo: 'Quiénes clasifican',
        puntos: [
          '3 grupos de 4: cada equipo juega contra sus 3 rivales.',
          'Copa Oro: 1.º y 2.º de cada grupo (6) + los 2 mejores terceros.',
          'Copa Plata: el peor tercero + los 3 equipos que terminan 4.º.',
          'No se reemplaza un tercero por un cuarto con más puntos.',
        ],
      },
      {
        titulo: 'Cómo se forma el ranking',
        puntos: [
          'Se cierran las tablas A, B y C con resultados validados.',
          'Se determinan los 2 mejores terceros de los 3 grupos.',
          'Los 8 de Oro se ordenan del 1.º al 8.º según: puntos, diferencia de goles, goles a favor, partido directo si existió y menos amarillas.',
        ],
      },
      {
        titulo: 'Cuartos, semifinales y final',
        puntos: [
          'Q1: 1.º vs 8.º · Q2: 4.º vs 5.º',
          'Q3: 2.º vs 7.º · Q4: 3.º vs 6.º',
          'S1: ganador Q1 vs ganador Q2 · S2: ganador Q3 vs ganador Q4',
          'Final: ganador S1 vs ganador S2.',
        ],
      },
      {
        titulo: 'Asignación automática de rivales',
        puntos: [
          'Los puestos 1.º a 4.º conservan su lugar en el cuadro; los puestos 5.º a 8.º son los rivales a reasignar.',
          'Se prueban las 24 asignaciones posibles y se eliminan las que enfrentan a equipos del mismo grupo en cualquiera de los cuartos.',
          'Entre las válidas se favorece primero al 1.º (rival de peor ranking posible: 8.º, luego 7.º, etc.), después al 2.º, al 3.º y al 4.º.',
          'No existe elección discrecional de la organización.',
        ],
      },
      {
        titulo: 'Ejemplo práctico',
        puntos: [
          'Ranking: 1A 2B 3C 4A 5B 6C 7B 8A.',
          'El cruce 1A vs 8A está prohibido (mismo grupo).',
          'Con la regla automática quedan: Q1 1A vs 7B · Q2 4A vs 6C · Q3 2B vs 8A · Q4 3C vs 5B.',
        ],
      },
    ],
  },
};

export const tienePrograma = (year: number) => year in PROGRAMAS;

// ── Resultados, tablas y cruces ─────────────────────────────────────────────

export type Resultado = {
  match_code: string;
  home_goals: number;
  away_goals: number;
  home_yellows: number;
  away_yellows: number;
  /** Solo en copas, cuando el partido termina empatado. */
  penalty_winner: 'local' | 'visita' | null;
};

export type FilaTabla = {
  equipo: string;
  generacion: number;
  /** Letra del grupo: A, B o C. */
  grupo: string;
  /** Puesto dentro del grupo (1 a 4). */
  puesto: number;
  pj: number; g: number; e: number; p: number;
  gf: number; gc: number; dg: number; pts: number;
  amarillas: number;
};

export type Cruce = { local?: string; visita?: string };

export type Torneo = {
  tablas: { nombre: string; filas: FilaTabla[] }[];
  jugadosGrupos: number;
  totalGrupos: number;
  gruposCompletos: boolean;
  /** Los 8 de Copa Oro ordenados del 1.º al 8.º (solo con los grupos cerrados). */
  rankingOro: FilaTabla[];
  /** Los 4 de Copa Plata: Plata 1 a Plata 4. */
  rankingPlata: FilaTabla[];
  /** Equipos de cada partido de copa, por código, a medida que se conocen. */
  cruces: Record<string, Cruce>;
};

/** Partidos del programa en orden, sin las pausas. */
export function partidosDe(programa: Programa): Partido[] {
  return programa.dias.flatMap(d =>
    d.bloques.flatMap(b => ('pausa' in b ? [] : [b.cancha1, b.cancha2].filter((p): p is Partido => !!p))),
  );
}

/** Quién ganó un partido de copa; si empataron, lo decide la tanda de penales. */
export function ganadorDe(cruce: Cruce | undefined, r: Resultado | undefined): string | undefined {
  if (!cruce?.local || !cruce.visita || !r) return undefined;
  if (r.home_goals > r.away_goals) return cruce.local;
  if (r.away_goals > r.home_goals) return cruce.visita;
  if (r.penalty_winner === 'local') return cruce.local;
  if (r.penalty_winner === 'visita') return cruce.visita;
  return undefined;
}

export function calcularTorneo(programa: Programa, resultados: Map<string, Resultado>): Torneo {
  const partidosGrupo = partidosDe(programa).filter(p => p.local && p.visita);

  const filas = new Map<string, FilaTabla>();
  for (const grupo of programa.grupos) {
    const letra = grupo.nombre.replace('Grupo ', '');
    for (const eq of grupo.equipos) {
      filas.set(eq.nombre, {
        equipo: eq.nombre, generacion: eq.generacion, grupo: letra, puesto: 0,
        pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, amarillas: 0,
      });
    }
  }

  let jugadosGrupos = 0;
  /** Ganador del partido directo entre dos equipos, si se jugó y no fue empate. */
  const directo = new Map<string, string>();
  for (const p of partidosGrupo) {
    const r = resultados.get(p.codigo);
    const loc = filas.get(p.local!);
    const vis = filas.get(p.visita!);
    if (!r || !loc || !vis) continue;
    jugadosGrupos++;
    loc.pj++; vis.pj++;
    loc.gf += r.home_goals; loc.gc += r.away_goals;
    vis.gf += r.away_goals; vis.gc += r.home_goals;
    loc.amarillas += r.home_yellows; vis.amarillas += r.away_yellows;
    if (r.home_goals > r.away_goals) { loc.g++; vis.p++; loc.pts += 3; directo.set(`${loc.equipo}|${vis.equipo}`, loc.equipo); }
    else if (r.home_goals < r.away_goals) { vis.g++; loc.p++; vis.pts += 3; directo.set(`${loc.equipo}|${vis.equipo}`, vis.equipo); }
    else { loc.e++; vis.e++; loc.pts++; vis.pts++; }
  }
  for (const f of filas.values()) f.dg = f.gf - f.gc;

  // Puntos, diferencia de goles, goles a favor, partido directo y menos amarillas.
  const comparar = (a: FilaTabla, b: FilaTabla) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.dg !== b.dg) return b.dg - a.dg;
    if (a.gf !== b.gf) return b.gf - a.gf;
    const gano = directo.get(`${a.equipo}|${b.equipo}`) ?? directo.get(`${b.equipo}|${a.equipo}`);
    if (gano) return gano === a.equipo ? -1 : 1;
    return a.amarillas - b.amarillas;
  };

  const tablas = programa.grupos.map(grupo => {
    // sort es estable: con todo igual se respeta el orden del sorteo.
    const ordenadas = grupo.equipos.map(e => filas.get(e.nombre)!).sort(comparar);
    ordenadas.forEach((f, i) => { f.puesto = i + 1; });
    return { nombre: grupo.nombre, filas: ordenadas };
  });

  const totalGrupos = partidosGrupo.length;
  const gruposCompletos = totalGrupos > 0 && jugadosGrupos === totalGrupos;

  const cruces: Record<string, Cruce> = {};
  let rankingOro: FilaTabla[] = [];
  let rankingPlata: FilaTabla[] = [];

  if (gruposCompletos) {
    const enPuesto = (n: number) => tablas.map(t => t.filas[n - 1]).filter(Boolean);
    const terceros = enPuesto(3).sort(comparar);
    const mejoresTerceros = terceros.slice(0, 2);
    const peorTercero = terceros.slice(2);

    rankingOro = [...enPuesto(1), ...enPuesto(2), ...mejoresTerceros].sort(comparar);
    rankingPlata = [...peorTercero, ...enPuesto(4)].sort(comparar);

    if (rankingOro.length === 8) {
      const rivales = asignarCuartos(rankingOro);
      // Q1: 1.º · Q3: 2.º · Q4: 3.º · Q2: 4.º, cada uno con el rival asignado.
      cruces.Q1 = { local: rankingOro[0].equipo, visita: rivales[0].equipo };
      cruces.Q3 = { local: rankingOro[1].equipo, visita: rivales[1].equipo };
      cruces.Q4 = { local: rankingOro[2].equipo, visita: rivales[2].equipo };
      cruces.Q2 = { local: rankingOro[3].equipo, visita: rivales[3].equipo };
    }
    if (rankingPlata.length === 4) {
      cruces.SP1 = { local: rankingPlata[0].equipo, visita: rankingPlata[3].equipo };
      cruces.SP2 = { local: rankingPlata[1].equipo, visita: rankingPlata[2].equipo };
    }
  }

  const gana = (codigo: string) => ganadorDe(cruces[codigo], resultados.get(codigo));
  cruces.S1 = { local: gana('Q1'), visita: gana('Q2') };
  cruces.S2 = { local: gana('Q3'), visita: gana('Q4') };
  cruces.FO = { local: gana('S1'), visita: gana('S2') };
  cruces.FP = { local: gana('SP1'), visita: gana('SP2') };

  return { tablas, jugadosGrupos, totalGrupos, gruposCompletos, rankingOro, rankingPlata, cruces };
}

/**
 * Rivales de cuartos para los puestos 1.º a 4.º. Se prueban las 24 formas de
 * repartir a los puestos 5.º a 8.º, se descartan las que cruzan a dos equipos
 * del mismo grupo y se favorece al 1.º (el rival de peor ranking posible),
 * después al 2.º, al 3.º y al 4.º.
 */
export function asignarCuartos(ranking: FilaTabla[]): FilaTabla[] {
  const cabezas = ranking.slice(0, 4);
  const resto = ranking.slice(4, 8);
  let mejor: number[] | null = null;

  const probar = (orden: number[], libres: number[]) => {
    if (orden.length === 4) {
      const valida = orden.every((idx, i) => resto[idx].grupo !== cabezas[i].grupo);
      if (!valida) return;
      // Índice más alto = peor ranking: gana la opción que primero le da más al 1.º.
      if (!mejor || orden.some((v, i) => v !== mejor![i] && orden.slice(0, i).every((x, j) => x === mejor![j]) && v > mejor![i])) {
        mejor = orden;
      }
      return;
    }
    for (const idx of libres) probar([...orden, idx], libres.filter(x => x !== idx));
  };
  probar([], [0, 1, 2, 3]);

  // Si ninguna combinación evita repetir grupo, queda el cuadro normal.
  return (mejor ?? [3, 2, 1, 0]).map(idx => resto[idx]);
}
