/**
 * Precios y preguntas que se muestran en las páginas públicas. Viven aquí, y no
 * dentro de cada página, porque también se usan para los datos estructurados
 * que leen Google y los buscadores con IA (ver src/lib/seo.ts): así lo que ve
 * la gente y lo que leen los buscadores nunca se contradicen.
 *
 * Los montos que se cobran de verdad están en las funciones de Supabase
 * create-flow-preference y create-mp-preference; si cambian, cambiar aquí también.
 */

export const PRECIOS = {
  pro: { mensual: '$9.990', anual: '$7.990', notaAnual: '$95.880 al año, en un pago' },
  elite: { mensual: '$19.990', anual: '$15.990', notaAnual: '$191.880 al año, en un pago' },
};

/** Lo mismo en números, para los datos estructurados. Pesos chilenos. */
export const MONTOS = {
  pro: { mensual: 9990, anual: 95880 },
  elite: { mensual: 19990, anual: 191880 },
};

/** Preguntas de la portada. */
export const PREGUNTAS_PORTADA: [string, string][] = [
  ['¿Necesito instalar algo?', 'No. MiClubPro funciona desde el navegador de tu celular o computador. Creas una cuenta y empiezas.'],
  ['¿Cómo funciona el mes de prueba?', 'Al registrarte tienes un mes completo gratis, sin tarjeta de crédito.'],
  ['¿Cómo confirman asistencia los jugadores?', 'Reciben un correo con un link único y confirman o rechazan con un clic. El capitán también puede confirmar a mano desde su panel.'],
  ['¿Cómo se arman los equipos?', 'El sistema toma a los confirmados, mira su nivel y posición, y los divide en dos equipos lo más parejos posible. El resultado se exporta a WhatsApp.'],
  ['¿Puedo cancelar cuando quiera?', 'Sí, sin preguntas ni multas. Tu equipo y sus datos quedan guardados 90 días después de cancelar.'],
  ['¿Mis datos están seguros?', 'Sí. Los datos viajan y se guardan cifrados, y no se venden ni se comparten con terceros.'],
];

/** Preguntas de la página /preguntas-frecuentes. */
export const PREGUNTAS_FRECUENTES: [string, string][] = [
  ['¿Qué es MiClubPro?', 'MiClubPro es una aplicación web para organizar equipos de fútbol 7 y fútbol amateur. Te permite administrar jugadores, confirmar asistencia, armar equipos equilibrados, controlar la caja del equipo y votar al MVP de cada partido.'],
  ['¿Necesito instalar algo?', 'No. MiClubPro funciona 100% desde el navegador de tu celular o computador. Solo necesitas crear una cuenta y ya puedes empezar.'],
  ['¿Cómo funciona el período de prueba?', 'Al registrarte obtienes 1 mes completamente gratis con hasta 10 jugadores registrados y 4 invitados. Sin tarjeta de crédito.'],
  ['¿Cuántos jugadores puedo tener en el plan gratuito?', 'El plan gratuito permite hasta 10 jugadores registrados y hasta 4 invitados para el armado de equipos, ideal para equipos pequeños o torneos amateur.'],
  ['¿Cuánto cuesta MiClubPro?', `El plan Pro cuesta ${PRECIOS.pro.mensual} al mes (hasta 14 jugadores) y el plan Elite ${PRECIOS.elite.mensual} al mes (jugadores ilimitados y gestión de liga). Pagando el año completo, cada plan sale 20% más barato. Los precios son en pesos chilenos y por equipo, no por jugador.`],
  ['¿Cómo confirman asistencia los jugadores?', 'Los jugadores reciben un correo con un link único. Con un clic confirman o rechazan su asistencia. El capitán también puede confirmar manualmente desde su panel.'],
  ['¿Cómo funciona el armado automático de equipos?', 'El sistema toma los jugadores confirmados, analiza su nivel y posición, y los divide en dos equipos lo más equilibrados posible, con un arquero por lado. El resultado se puede exportar directo a WhatsApp.'],
  ['¿Puedo cancelar cuando quiera?', 'Sí, sin preguntas ni penalidades. Tu equipo y datos quedan guardados por 90 días después de cancelar.'],
  ['¿Mis datos están seguros?', 'Sí. Los datos viajan y se guardan cifrados, y cada equipo solo ve su propia información. No vendemos ni compartimos datos de tu equipo con terceros.'],
];
