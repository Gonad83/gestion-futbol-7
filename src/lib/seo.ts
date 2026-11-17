import { MONTOS, PREGUNTAS_FRECUENTES, PREGUNTAS_PORTADA } from './contenidoPublico';

/**
 * Lo que los buscadores (Google, Bing) y los asistentes con IA (ChatGPT,
 * Perplexity, Claude, Gemini) leen de cada página pública: título,
 * descripción, dirección oficial y datos estructurados (JSON-LD).
 *
 * Lo usan dos lados: scripts/prerender.mjs, que al compilar escribe un HTML
 * completo por página (los robots de IA no ejecutan JavaScript), y el
 * componente Seo, que actualiza la pestaña al navegar dentro de la app.
 */

export const SITIO = 'https://miclubpro.cl';
export const MARCA = 'MiClubPro';

export interface PaginaPublica {
  ruta: string;
  titulo: string;
  descripcion: string;
  /** Nombre corto para la ruta de migas (BreadcrumbList). */
  miga?: string;
  prioridad: number;
  frecuencia: 'weekly' | 'monthly' | 'yearly';
}

export const PAGINAS: PaginaPublica[] = [
  {
    ruta: '/',
    titulo: 'MiClubPro · App para organizar tu equipo de fútbol 7',
    descripcion: 'Confirma asistencia, arma equipos parejos por nivel y lleva las cuotas de tu equipo de fútbol 7 desde el celular. Sin instalar nada. Un mes gratis, sin tarjeta.',
    prioridad: 1,
    frecuencia: 'weekly',
  },
  {
    ruta: '/preguntas-frecuentes',
    titulo: 'Preguntas frecuentes · MiClubPro',
    descripcion: 'Cómo funciona MiClubPro: prueba gratis, precios, confirmación de asistencia por correo, armado automático de equipos, cancelación y seguridad de los datos.',
    miga: 'Preguntas frecuentes',
    prioridad: 0.8,
    frecuencia: 'monthly',
  },
  {
    ruta: '/tutoriales',
    titulo: 'Tutoriales: cómo organizar tu equipo de fútbol · MiClubPro',
    descripcion: 'Guías paso a paso para crear tu equipo, invitar jugadores, agendar partidos, confirmar asistencia y armar equipos equilibrados en MiClubPro.',
    miga: 'Tutoriales',
    prioridad: 0.7,
    frecuencia: 'monthly',
  },
  {
    ruta: '/centro-de-ayuda',
    titulo: 'Centro de ayuda · MiClubPro',
    descripcion: 'Ayuda para usar MiClubPro: plantilla de jugadores, calendario, armado de equipos, caja del equipo, votación MVP y configuración.',
    miga: 'Centro de ayuda',
    prioridad: 0.6,
    frecuencia: 'monthly',
  },
  {
    ruta: '/sobre-nosotros',
    titulo: 'Sobre nosotros · MiClubPro',
    descripcion: 'MiClubPro nació en Chile de una frustración real: coordinar un equipo de fútbol cada semana entre WhatsApp, planillas y cobros informales.',
    miga: 'Sobre nosotros',
    prioridad: 0.5,
    frecuencia: 'yearly',
  },
  {
    ruta: '/contacto',
    titulo: 'Contacto · MiClubPro',
    descripcion: 'Escríbenos a hola@miclubpro.cl o por WhatsApp al +56 9 5756 1136. Respondemos dudas sobre planes, pagos y uso de MiClubPro.',
    miga: 'Contacto',
    prioridad: 0.5,
    frecuencia: 'yearly',
  },
  {
    ruta: '/seguridad',
    titulo: 'Seguridad · MiClubPro',
    descripcion: 'Cómo protege MiClubPro los datos de tu equipo: cifrado en tránsito y en reposo, accesos por rol y respaldos diarios.',
    miga: 'Seguridad',
    prioridad: 0.4,
    frecuencia: 'yearly',
  },
  {
    ruta: '/terminos-de-servicio',
    titulo: 'Términos de servicio · MiClubPro',
    descripcion: 'Condiciones de uso de MiClubPro, la plataforma de gestión para equipos de fútbol amateur.',
    miga: 'Términos de servicio',
    prioridad: 0.2,
    frecuencia: 'yearly',
  },
  {
    ruta: '/politica-de-privacidad',
    titulo: 'Política de privacidad · MiClubPro',
    descripcion: 'Qué datos guarda MiClubPro, para qué se usan y cómo pedir su corrección o eliminación.',
    miga: 'Política de privacidad',
    prioridad: 0.2,
    frecuencia: 'yearly',
  },
];

export const paginaDe = (ruta: string) => PAGINAS.find(p => p.ruta === ruta);

const url = (ruta: string) => (ruta === '/' ? `${SITIO}/` : `${SITIO}${ruta}`);

const ORGANIZACION = {
  '@type': 'Organization',
  '@id': `${SITIO}/#organizacion`,
  name: MARCA,
  url: `${SITIO}/`,
  logo: `${SITIO}/logo.png`,
  email: 'hola@miclubpro.cl',
  telephone: '+56957561136',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    telephone: '+56957561136',
    email: 'hola@miclubpro.cl',
    availableLanguage: 'es',
    areaServed: 'CL',
  },
  areaServed: { '@type': 'Country', name: 'Chile' },
};

const oferta = (nombre: string, precio: number, ciclo: 'P1M' | 'P1Y', descripcion: string) => ({
  '@type': 'Offer',
  name: nombre,
  description: descripcion,
  price: precio,
  priceCurrency: 'CLP',
  url: `${SITIO}/#pricing`,
  ...(precio > 0 && {
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: precio,
      priceCurrency: 'CLP',
      billingDuration: ciclo,
    },
  }),
});

const APLICACION = {
  '@type': 'SoftwareApplication',
  '@id': `${SITIO}/#app`,
  name: MARCA,
  url: `${SITIO}/`,
  applicationCategory: 'SportsApplication',
  applicationSubCategory: 'Gestión de equipos de fútbol 7',
  operatingSystem: 'Web, Android, iOS',
  inLanguage: 'es-CL',
  description: 'Aplicación web para capitanes de equipos de fútbol 7 y fútbol amateur: confirmación de asistencia por correo, armado automático de equipos parejos por nivel y posición, caja del equipo con morosos, votación MVP, calendario y estadísticas.',
  featureList: [
    'Confirmación de asistencia con un clic desde el correo',
    'Armado automático de dos equipos parejos por nivel y posición',
    'Exportación de la lista y los equipos a WhatsApp',
    'Caja del equipo: cuotas, ingresos, gastos y morosos',
    'Votación MVP después de cada partido',
    'Calendario de partidos y cumpleaños',
    'Estadísticas de asistencia por jugador',
  ],
  publisher: { '@id': `${SITIO}/#organizacion` },
  offers: [
    oferta('Starter', 0, 'P1M', 'Un mes gratis, sin tarjeta: 1 equipo, 10 jugadores y 4 invitados.'),
    oferta('Pro mensual', MONTOS.pro.mensual, 'P1M', '1 equipo, hasta 14 jugadores.'),
    oferta('Pro anual', MONTOS.pro.anual, 'P1Y', '1 equipo, hasta 14 jugadores. Pago anual con 20% de descuento.'),
    oferta('Elite mensual', MONTOS.elite.mensual, 'P1M', 'Jugadores ilimitados y gestión de liga.'),
    oferta('Elite anual', MONTOS.elite.anual, 'P1Y', 'Jugadores ilimitados y gestión de liga. Pago anual con 20% de descuento.'),
  ],
};

const preguntas = (lista: [string, string][], ruta: string) => ({
  '@type': 'FAQPage',
  '@id': `${url(ruta)}#preguntas`,
  mainEntity: lista.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

/** Datos estructurados de una página, listos para un <script type="application/ld+json">. */
export function datosEstructurados(ruta: string): object {
  const pagina = paginaDe(ruta);
  const grafo: object[] = [ORGANIZACION];

  if (ruta === '/') {
    grafo.push(
      {
        '@type': 'WebSite',
        '@id': `${SITIO}/#sitio`,
        url: `${SITIO}/`,
        name: MARCA,
        inLanguage: 'es-CL',
        publisher: { '@id': `${SITIO}/#organizacion` },
      },
      APLICACION,
      preguntas(PREGUNTAS_PORTADA, ruta),
    );
  } else if (pagina) {
    grafo.push({
      '@type': 'WebPage',
      '@id': url(ruta),
      url: url(ruta),
      name: pagina.titulo,
      description: pagina.descripcion,
      inLanguage: 'es-CL',
      isPartOf: { '@id': `${SITIO}/#sitio` },
    }, {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO}/` },
        { '@type': 'ListItem', position: 2, name: pagina.miga ?? pagina.titulo, item: url(ruta) },
      ],
    });
    if (ruta === '/preguntas-frecuentes') grafo.push(preguntas(PREGUNTAS_FRECUENTES, ruta));
  }

  return { '@context': 'https://schema.org', '@graph': grafo };
}

export const urlCanonica = url;
