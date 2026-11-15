/**
 * Reportes de Caja para descargar (CSV) o imprimir como PDF.
 * Solo arman texto; no tocan la base de datos ni la pantalla.
 */
import type { FilaCuota, Movimiento } from './api/finanzas';
import { MONTHS, clp, escapeHtml } from './formato';

export type PestanaCaja = 'cuotas' | 'ingresos' | 'gastos' | 'morosidad';

export interface DatosReporte {
  pestana: PestanaCaja;
  month: number;
  year: number;
  payments: FilaCuota[];
  cashIncomes: Movimiento[];
  expenses: Movimiento[];
  totalCashIncomes: number;
  totalExpenses: number;
}

/** Convierte filas en texto CSV, con comillas dobles escapadas. */
export function aCsv(filas: unknown[][]): string {
  return filas.map((fila) => fila.map((celda) => `"${String(celda ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

/** Nombre de archivo y filas del CSV según la pestaña abierta. */
export function csvDeCaja(d: DatosReporte): { nombre: string; filas: unknown[][] } {
  if (d.pestana === 'cuotas') {
    const mes = MONTHS[d.month - 1];
    return {
      nombre: `cuotas-${mes}-${d.year}`,
      filas: [['Jugador', 'Estado', 'Monto Pagado', 'Mes', 'Año'], ...d.payments.map((p) => [p.name, p.status, p.amount, mes, d.year])],
    };
  }
  const esIngresos = d.pestana === 'ingresos';
  const movimientos = esIngresos ? d.cashIncomes : d.expenses;
  return {
    nombre: esIngresos ? 'ingresos-caja' : 'gastos',
    filas: [['Concepto', 'Monto', 'Fecha'], ...movimientos.map((m) => [m.concept, m.amount, m.date])],
  };
}

/** Muestra la fecha guardada (sin hora) como fecha local, sin correrse un día. */
const fechaLocal = (fecha: string) =>
  new Date(new Date(fecha).getTime() + new Date().getTimezoneOffset() * 60000).toLocaleDateString('es-CL');

const ESTILOS = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 32px; font-size: 13px; }
        h1 { font-size: 20px; font-weight: 900; color: #003822; margin-bottom: 4px; }
        .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
        .summary { display: flex; gap: 24px; background: #f0faf5; border-left: 4px solid #00c97a; padding: 10px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        thead { background: #003822; color: white; }
        th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
        td { padding: 9px 12px; border-bottom: 1px solid #e8e8e8; }
        tr:last-child td { border-bottom: none; }
        tr.paid { background: #f0fdf4; }
        tr.pending { background: #fffbeb; }
        .nick { color: #999; font-size: 11px; }
        .badge { padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
        .badge-paid { background: #d1fae5; color: #065f46; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .green { color: #059669; font-weight: 700; }
        .red { color: #dc2626; font-weight: 700; }
        .footer { margin-top: 24px; font-size: 10px; color: #aaa; text-align: right; }
        @media print { body { padding: 16px; } }`;

function tablaMovimientos(movimientos: Movimiento[], clase: 'green' | 'red', signo: '+' | '-') {
  return `
        <table>
          <thead><tr><th>#</th><th>Concepto</th><th>Monto</th><th>Fecha</th></tr></thead>
          <tbody>
            ${movimientos.map((m, i) => `
              <tr>
                <td>${i + 1}</td><td>${escapeHtml(m.concept)}</td>
                <td class="${clase}">${signo}${clp(Number(m.amount))}</td>
                <td>${fechaLocal(m.date)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
}

/**
 * Página HTML lista para imprimir. Los nombres, apodos y conceptos los escribe
 * la gente del equipo, así que siempre pasan por escapeHtml.
 */
export function htmlDeCaja(d: DatosReporte): string {
  let title: string;
  let cuerpo: string;

  if (d.pestana === 'cuotas') {
    title = `Control de Cuotas — ${MONTHS[d.month - 1]} ${d.year}`;
    const pagadas = d.payments.filter((p) => p.status === 'Pagado');
    const pendientes = d.payments.filter((p) => p.status !== 'Pagado' && p.status !== 'Exento').length;
    const totalMes = pagadas.reduce((acc, p) => acc + Number(p.amount), 0);
    cuerpo = `
        <div class="summary">
          <span>✅ Pagados: <b>${pagadas.length}</b></span>
          <span>⏳ Pendientes: <b>${pendientes}</b></span>
          <span>💰 Total recaudado: <b>${clp(totalMes)}</b></span>
        </div>
        <table>
          <thead><tr><th>#</th><th>Jugador</th><th>Estado</th><th>Monto</th></tr></thead>
          <tbody>
            ${d.payments.map((p, i) => `
              <tr class="${p.status === 'Pagado' ? 'paid' : 'pending'}">
                <td>${i + 1}</td>
                <td>${escapeHtml(p.name)}${p.nickname ? ` <span class="nick">"${escapeHtml(p.nickname)}"</span>` : ''}</td>
                <td><span class="badge ${p.status === 'Pagado' ? 'badge-paid' : 'badge-pending'}">${escapeHtml(p.status)}</span></td>
                <td>${clp(p.amount)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
  } else if (d.pestana === 'ingresos') {
    title = 'Ingresos de Caja';
    cuerpo = `
        <div class="summary"><span>💰 Total: <b>${clp(d.totalCashIncomes)}</b></span></div>${tablaMovimientos(d.cashIncomes, 'green', '+')}`;
  } else {
    title = 'Registro de Gastos';
    cuerpo = `
        <div class="summary"><span>💸 Total gastos: <b>${clp(d.totalExpenses)}</b></span></div>${tablaMovimientos(d.expenses, 'red', '-')}`;
  }

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>${escapeHtml(title)}</title>
      <style>${ESTILOS}
      </style>
    </head><body>
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">Generado el ${new Date().toLocaleDateString('es-CL')} · MiClubPro</p>
      ${cuerpo}
      <p class="footer">MiClubPro.cl — Gestión de Fútbol 7</p>
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`;
}
