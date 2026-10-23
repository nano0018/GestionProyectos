// Lógica pura de relaciones predecesora/dependiente entre actividades de un proyecto.
// Las relaciones se guardan como arrays de `id_actividad`; son fin-a-inicio con fechas
// inclusivas (una dependiente empieza como mínimo el día siguiente al fin de su predecesora)
// menos el traslape permitido: `dependiente.traslapes = { [idPredecesora]: dias }` (0 si falta).

const MS_PER_DAY = 86400000;
const toMs = (str) => Date.parse(`${str}T00:00:00Z`);
const addDays = (str, n) => new Date(toMs(str) + n * MS_PER_DAY).toISOString().split('T')[0];
const diffDays = (a, b) => Math.round((toMs(a) - toMs(b)) / MS_PER_DAY);

// Primer día en que `dep` puede empezar según su predecesora `pred` y el traslape configurado.
export const inicioMinimo = (dep, pred) =>
  addDays(pred.fin_actividad, 1 - (Number(dep.traslapes?.[pred.id_actividad]) || 0));

// Traslape (días) de `act` respecto a cada una de sus predecesoras, calculado desde el fin de la
// predecesora: cuántos días antes de que ella termine empieza `act` (0 si empieza después).
export function calcularTraslapes(act, actividades) {
  const mapa = porId(actividades);
  const out = {};
  (act.actividades_predecesoras || []).forEach((p) => {
    const pred = mapa.get(p);
    if (!pred) return;
    const dias = diffDays(addDays(pred.fin_actividad, 1), act.inicio_actividad);
    if (dias > 0) out[p] = dias;
  });
  return out;
}

// Nuevas fechas de `act` para que traslape `dias` con `pred`, conservando su duración.
export function fechasParaTraslape(act, pred, dias) {
  const inicio = addDays(pred.fin_actividad, 1 - dias);
  return { inicio, fin: addDays(act.fin_actividad, diffDays(inicio, act.inicio_actividad)) };
}

const porId = (actividades) => new Map(actividades.map((a) => [a.id_actividad, a]));

// Aristas predecesora -> actividad, uniendo ambos lados de la relación.
function construirAristas(actividades) {
  const ids = new Set(actividades.map((a) => a.id_actividad));
  const sig = new Map(actividades.map((a) => [a.id_actividad, new Set()]));
  actividades.forEach((a) => {
    (a.actividades_predecesoras || []).forEach((p) => ids.has(p) && sig.get(p).add(a.id_actividad));
    (a.actividades_dependientes || []).forEach((d) => ids.has(d) && sig.get(a.id_actividad).add(d));
  });
  return sig;
}

// `actividades` ya incluye a `editada` (identificada por id_actividad). Deja simétrico el
// grafo: las demás actividades reflejan lo que `editada` declara. `idAnterior` limpia
// referencias viejas si cambió el id_actividad.
export function sincronizarRelaciones(actividades, editada, idAnterior = editada.id_actividad) {
  const id = editada.id_actividad;
  const pre = editada.actividades_predecesoras || [];
  const dep = editada.actividades_dependientes || [];
  const sin = (lista) => (lista || []).filter((x) => x !== idAnterior && x !== id);

  return actividades.map((a) => {
    if (a.id_actividad === id) return a;
    const predecesoras = sin(a.actividades_predecesoras);
    const dependientes = sin(a.actividades_dependientes);
    if (pre.includes(a.id_actividad)) dependientes.push(id);
    if (dep.includes(a.id_actividad)) predecesoras.push(id);
    // El traslape de `a` hacia `editada` sobrevive solo si editada sigue siendo su predecesora
    const traslapes = { ...(a.traslapes || {}) };
    const previo = traslapes[idAnterior];
    delete traslapes[idAnterior];
    delete traslapes[id];
    if (predecesoras.includes(id) && previo !== undefined) traslapes[id] = previo;
    return {
      ...a,
      traslapes,
      actividades_predecesoras: predecesoras.sort((x, y) => x - y),
      actividades_dependientes: dependientes.sort((x, y) => x - y)
    };
  });
}

// Elimina `id` de las relaciones de todas las demás actividades.
export function quitarActividad(actividades, id) {
  return actividades
    .filter((a) => a.id_actividad !== id)
    .map((a) => ({
      ...a,
      actividades_predecesoras: (a.actividades_predecesoras || []).filter((x) => x !== id),
      actividades_dependientes: (a.actividades_dependientes || []).filter((x) => x !== id),
      traslapes: Object.fromEntries(Object.entries(a.traslapes || {}).filter(([k]) => Number(k) !== id))
    }));
}

export function tieneCiclo(actividades) {
  const sig = construirAristas(actividades);
  const estado = new Map(); // 1 = en curso, 2 = terminado
  const visitar = (n) => {
    estado.set(n, 1);
    for (const m of sig.get(n)) {
      if (estado.get(m) === 1) return true;
      if (!estado.has(m) && visitar(m)) return true;
    }
    estado.set(n, 2);
    return false;
  };
  return [...sig.keys()].some((n) => !estado.has(n) && visitar(n));
}

// Pares "pred-dep" cuya fecha de inicio ya viola el mínimo permitido (estado heredado, p.ej. de un Excel).
export function violaciones(actividades) {
  const mapa = porId(actividades);
  const out = new Set();
  actividades.forEach((a) =>
    (a.actividades_predecesoras || []).forEach((p) => {
      const pred = mapa.get(p);
      if (pred && a.inicio_actividad < inicioMinimo(a, pred)) out.add(`${p}-${a.id_actividad}`);
    })
  );
  return out;
}

// Empuja hacia adelante las actividades que empiezan antes de lo permitido por su predecesora,
// conservando su duración y propagando en cascada. Nunca adelanta fechas.
// - `ignorar`: pares "pred-dep" (ver `violaciones`) que ya incumplían antes y no se tocan.
// - `finProyecto`: el plazo no puede extenderse; lo que no quepa se devuelve en `excede` y no se mueve.
// Devuelve { actividades, movidas, excede } (ids de actividad). Con ciclos no toca las implicadas.
export function reprogramarDependientes(actividades, { finProyecto = null, ignorar = new Set() } = {}) {
  const sig = construirAristas(actividades);
  const grado = new Map([...sig.keys()].map((k) => [k, 0]));
  sig.forEach((set) => set.forEach((m) => grado.set(m, grado.get(m) + 1)));

  const cola = [...grado].filter(([, g]) => g === 0).map(([k]) => k);
  const actuales = porId(actividades.map((a) => ({ ...a })));
  const movidas = new Set();
  const excede = new Set();

  while (cola.length) {
    const n = cola.shift();
    const pred = actuales.get(n);
    for (const m of sig.get(n)) {
      const dep = actuales.get(m);
      const minInicio = inicioMinimo(dep, pred);
      if (!ignorar.has(`${n}-${m}`) && dep.inicio_actividad < minInicio) {
        const delta = diffDays(minInicio, dep.inicio_actividad);
        const nuevoFin = addDays(dep.fin_actividad, delta);
        if (finProyecto && nuevoFin > finProyecto) {
          excede.add(m);
        } else {
          dep.inicio_actividad = minInicio;
          dep.fin_actividad = nuevoFin;
          movidas.add(m);
        }
      }
      grado.set(m, grado.get(m) - 1);
      if (grado.get(m) === 0) cola.push(m);
    }
  }

  return {
    actividades: actividades.map((a) => actuales.get(a.id_actividad)),
    movidas: [...movidas].sort((x, y) => x - y),
    excede: [...excede].sort((x, y) => x - y)
  };
}
