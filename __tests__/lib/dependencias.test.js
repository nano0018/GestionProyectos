import { sincronizarRelaciones, quitarActividad, tieneCiclo, reprogramarDependientes, violaciones, calcularTraslapes, fechasParaTraslape } from '../../src/lib/dependencias.js';

const act = (id, inicio, fin, pre = [], dep = []) => ({
  id_actividad: id, inicio_actividad: inicio, fin_actividad: fin,
  actividades_predecesoras: pre, actividades_dependientes: dep
});

describe('sincronizarRelaciones', () => {
  test('refleja predecesoras y dependientes en el otro lado', () => {
    const lista = [act(1, '2026-01-01', '2026-01-05'), act(2, '2026-01-06', '2026-01-08', [1], [3]), act(3, '2026-01-09', '2026-01-10')];
    const r = sincronizarRelaciones(lista, lista[1]);
    expect(r[0].actividades_dependientes).toEqual([2]);
    expect(r[2].actividades_predecesoras).toEqual([2]);
  });

  test('quita referencias al id anterior y a relaciones eliminadas', () => {
    const lista = [act(1, '2026-01-01', '2026-01-05', [], [2]), act(5, '2026-01-06', '2026-01-08')];
    const r = sincronizarRelaciones(lista, lista[1], 2);
    expect(r[0].actividades_dependientes).toEqual([]);
  });
});

test('quitarActividad limpia referencias', () => {
  const lista = [act(1, '2026-01-01', '2026-01-02', [], [2]), act(2, '2026-01-03', '2026-01-04', [1])];
  const r = quitarActividad(lista, 1);
  expect(r).toHaveLength(1);
  expect(r[0].actividades_predecesoras).toEqual([]);
});

describe('tieneCiclo', () => {
  test('detecta ciclo directo e indirecto, y acepta grafos acíclicos', () => {
    expect(tieneCiclo([act(1, 'x', 'x', [2]), act(2, 'x', 'x', [1])])).toBe(true);
    expect(tieneCiclo([act(1, 'x', 'x', [3]), act(2, 'x', 'x', [1]), act(3, 'x', 'x', [2])])).toBe(true);
    expect(tieneCiclo([act(1, 'x', 'x'), act(2, 'x', 'x', [1]), act(3, 'x', 'x', [1, 2])])).toBe(false);
  });
});

describe('reprogramarDependientes', () => {
  test('empuja en cascada conservando duración', () => {
    const lista = [
      act(1, '2026-01-01', '2026-01-10'),
      act(2, '2026-01-05', '2026-01-07', [1]),
      act(3, '2026-01-08', '2026-01-09', [2])
    ];
    const { actividades, movidas } = reprogramarDependientes(lista);
    expect(actividades[1]).toMatchObject({ inicio_actividad: '2026-01-11', fin_actividad: '2026-01-13' });
    expect(actividades[2]).toMatchObject({ inicio_actividad: '2026-01-14', fin_actividad: '2026-01-15' });
    expect(movidas).toEqual([2, 3]);
  });

  test('no mueve lo que ya cumple y nunca adelanta', () => {
    const lista = [act(1, '2026-01-01', '2026-01-05'), act(2, '2026-02-01', '2026-02-03', [1])];
    const { actividades, movidas } = reprogramarDependientes(lista);
    expect(movidas).toEqual([]);
    expect(actividades[1].inicio_actividad).toBe('2026-02-01');
  });
});

describe('traslapes y plazo del proyecto', () => {
  const lista = () => [
    act(1, '2026-01-01', '2026-01-10'),
    { ...act(2, '2026-01-08', '2026-01-12', [1]), traslapes: { 1: 3 } }
  ];

  test('respeta el traslape permitido', () => {
    expect(reprogramarDependientes(lista()).movidas).toEqual([]);
    const l = lista(); l[1].traslapes = { 1: 1 };
    expect(reprogramarDependientes(l).actividades[1].inicio_actividad).toBe('2026-01-10');
  });

  test('no extiende el plazo: devuelve excede y no mueve', () => {
    const l = lista(); l[1].traslapes = {};
    const r = reprogramarDependientes(l, { finProyecto: '2026-01-12' });
    expect(r.excede).toEqual([2]);
    expect(r.actividades[1].fin_actividad).toBe('2026-01-12');
  });

  test('ignora incumplimientos previos', () => {
    const l = lista(); l[1].traslapes = {};
    expect(violaciones(l).has('1-2')).toBe(true);
    expect(reprogramarDependientes(l, { ignorar: violaciones(l) }).movidas).toEqual([]);
  });
});

describe('traslape calculado desde el fin de la predecesora', () => {
  const pred = act(1, '2026-01-01', '2026-01-10');
  const dep = act(2, '2026-01-08', '2026-01-12', [1]);

  test('se deduce de las fechas', () => {
    expect(calcularTraslapes(dep, [pred, dep])).toEqual({ 1: 3 });
    expect(calcularTraslapes({ ...dep, inicio_actividad: '2026-01-11' }, [pred, dep])).toEqual({});
  });

  test('al modificarlo se mueven inicio y fin conservando la duración', () => {
    expect(fechasParaTraslape(dep, pred, 1)).toEqual({ inicio: '2026-01-10', fin: '2026-01-14' });
    expect(fechasParaTraslape(dep, pred, 0)).toEqual({ inicio: '2026-01-11', fin: '2026-01-15' });
  });
});
