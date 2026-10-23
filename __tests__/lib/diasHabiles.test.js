import { contarHabiles, sumarHabiles, moverBarra, setFestivos } from '../../src/lib/diasHabiles.js';

// 2026-01-05 es lunes
describe('días hábiles', () => {
  test('cuenta lunes a viernes y excluye festivos', () => {
    expect(contarHabiles('2026-01-05', '2026-01-11')).toBe(5);
    expect(contarHabiles('2026-01-05', '2026-01-11', setFestivos(['2026-01-06']))).toBe(4);
  });

  test('sumarHabiles salta fines de semana y festivos', () => {
    expect(sumarHabiles('2026-01-05', 5)).toBe('2026-01-09');
    expect(sumarHabiles('2026-01-05', 6)).toBe('2026-01-12');
    expect(sumarHabiles('2026-01-05', 3, setFestivos(['2026-01-06']))).toBe('2026-01-08');
  });
});

describe('moverBarra', () => {
  const act = { inicio_actividad: '2026-01-05', fin_actividad: '2026-01-07' }; // lun-mié, 3 hábiles

  test('move conserva los días hábiles y ajusta a hábil', () => {
    expect(moverBarra(act, 'move', 4)).toEqual({ inicio_actividad: '2026-01-09', fin_actividad: '2026-01-13' });
    expect(moverBarra(act, 'move', 5)).toEqual({ inicio_actividad: '2026-01-12', fin_actividad: '2026-01-14' });
  });

  test('start y end cambian un solo extremo', () => {
    expect(moverBarra(act, 'end', 2)).toEqual({ inicio_actividad: '2026-01-05', fin_actividad: '2026-01-09' });
    expect(moverBarra(act, 'start', 1)).toEqual({ inicio_actividad: '2026-01-06', fin_actividad: '2026-01-07' });
    expect(moverBarra(act, 'end', -10).fin_actividad).toBe('2026-01-05');
  });

  test('respeta los límites del proyecto', () => {
    const lim = { min: '2026-01-05', max: '2026-01-09' };
    expect(moverBarra(act, 'move', 20, undefined, lim)).toEqual({ inicio_actividad: '2026-01-07', fin_actividad: '2026-01-09' });
    expect(moverBarra(act, 'end', 20, undefined, lim).fin_actividad).toBe('2026-01-09');
  });
});
