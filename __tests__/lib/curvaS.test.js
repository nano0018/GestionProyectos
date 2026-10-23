import { calcularPuntoEnFecha, ultimoAvance } from '../../src/lib/curvaS.js';

const base = { inicio_actividad: '2026-01-01', fin_actividad: '2026-01-11', avance_real: 0 };

describe('avance real con historial', () => {
  const act = { ...base, historial_avance: [{ fecha: '2026-01-06', avance: 50 }, { fecha: '2026-01-09', avance: 80 }] };
  const real = (fecha, corte = '2026-01-11') => calcularPuntoEnFecha([act], fecha, corte).real;

  test('interpola por tramos y queda plano tras el último registro', () => {
    expect(real('2026-01-01')).toBeCloseTo(0);
    expect(real('2026-01-03')).toBeCloseTo(20);
    expect(real('2026-01-06')).toBeCloseTo(50);
    expect(real('2026-01-09')).toBeCloseTo(80);
    expect(real('2026-01-11')).toBeCloseTo(80);
  });

  test('ignora registros posteriores a la fecha de corte', () => {
    expect(real('2026-01-06', '2026-01-06')).toBeCloseTo(50);
    expect(real('2026-01-09', '2026-01-06')).toBeCloseTo(50);
  });

  test('sin historial conserva la acumulación lineal', () => {
    const sin = { ...base, avance_real: 40 };
    expect(calcularPuntoEnFecha([sin], '2026-01-11', '2026-01-11').real).toBeCloseTo(40);
    expect(calcularPuntoEnFecha([sin], '2026-01-06', '2026-01-11').real).toBeCloseTo(20);
  });

  test('ultimoAvance toma el registro de fecha más reciente', () => {
    expect(ultimoAvance(act.historial_avance)).toBe(80);
    expect(ultimoAvance([])).toBe(0);
  });
});
