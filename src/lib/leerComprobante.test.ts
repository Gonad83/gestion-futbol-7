import { describe, expect, it } from 'vitest';
import { montoDelTexto } from './leerComprobante';

describe('montoDelTexto', () => {
  it('toma el monto de la línea que dice "Monto"', () => {
    const texto = 'Transferencia exitosa\nMonto $8.000\nCuenta destino 12.345.678-9\nSaldo disponible $154.320';
    expect(montoDelTexto(texto)).toBe(8000);
  });

  it('lo encuentra en la línea siguiente a la palabra clave', () => {
    expect(montoDelTexto('Comprobante\nMonto transferido\n$ 16.000\nN° operación 004512889')).toBe(16000);
  });

  it('acepta el $ leído como S y montos sin punto de miles', () => {
    expect(montoDelTexto('Transferiste S8.000 a Juan Pérez')).toBe(8000);
    expect(montoDelTexto('Total: $24000')).toBe(24000);
  });

  it('sin palabra clave usa el monto con $ que más se repite', () => {
    expect(montoDelTexto('$40.000\nJuan Pérez\nBanco Estado\n$40.000\nComisión $300')).toBe(40000);
  });

  it('nunca toma el saldo de la cuenta ni la comisión como el monto pagado', () => {
    expect(montoDelTexto('Transferencia exitosa\nMonto\nDestinatario Juan\nSaldo disponible $154.320')).toBeNull();
    expect(montoDelTexto('Saldo disponible\n$154.320\nComisión $300')).toBeNull();
    expect(montoDelTexto('Saldo disponible\n$154.320\nMonto\n$8.000')).toBe(8000);
  });

  it('no confunde un RUT, una cuenta ni una fecha con el monto', () => {
    expect(montoDelTexto('RUT 12.345.678-9\nCuenta 000123456789\n18/11/2026 22:41')).toBeNull();
  });

  it('ignora montos fuera de rango y texto vacío', () => {
    expect(montoDelTexto('Monto $50')).toBeNull();
    expect(montoDelTexto('')).toBeNull();
  });
});
