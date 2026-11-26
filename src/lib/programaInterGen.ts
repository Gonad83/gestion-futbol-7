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

type Programa = {
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
          { hora: '16:30–17:15', cancha1: c('Final', 'Final Copa Plata', 'plata') },
          { hora: '17:15–18:00', cancha1: c('Final', 'Final Copa Oro', 'oro') },
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
