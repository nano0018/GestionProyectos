// Días hábiles: lunes a viernes, excluyendo los festivos del proyecto (fechas YYYY-MM-DD).
// Las fechas guardadas siguen siendo de calendario; esto solo las mide y las ajusta.

const MS_PER_DAY = 86400000;
const toMs = (str) => Date.parse(`${str}T00:00:00Z`);
export const sumarDias = (str, n) => new Date(toMs(str) + n * MS_PER_DAY).toISOString().split('T')[0];
export const diasCalendario = (inicio, fin) => Math.round((toMs(fin) - toMs(inicio)) / MS_PER_DAY) + 1;

export const setFestivos = (lista) => new Set(lista || []);

export function esHabil(fecha, festivos = new Set()) {
  const dia = new Date(toMs(fecha)).getUTCDay();
  return dia !== 0 && dia !== 6 && !festivos.has(fecha);
}

// Días hábiles entre inicio y fin, ambos inclusive.
export function contarHabiles(inicio, fin, festivos = new Set()) {
  let n = 0;
  for (let d = inicio; d <= fin; d = sumarDias(d, 1)) if (esHabil(d, festivos)) n++;
  return n;
}

// Día hábil más cercano a `fecha` (ella misma si lo es), buscando hacia `dir` (1 adelante, -1 atrás).
export function habilMasCercano(fecha, festivos = new Set(), dir = 1) {
  let d = fecha;
  while (!esHabil(d, festivos)) d = sumarDias(d, dir);
  return d;
}

// Fecha en que termina una actividad de `n` días hábiles que empieza en `inicio` (día 1).
export function sumarHabiles(inicio, n, festivos = new Set()) {
  let d = habilMasCercano(inicio, festivos, 1);
  for (let cuenta = 1; cuenta < n; ) {
    d = sumarDias(d, 1);
    if (esHabil(d, festivos)) cuenta++;
  }
  return d;
}

// Nuevas fechas de una barra del Gantt arrastrada `deltaDias` (calendario) en el modo
// 'move' (mueve conservando los días hábiles), 'start' (cambia inicio) o 'end' (cambia fin).
// `limites` = { min, max } opcional (fechas del proyecto).
export function moverBarra(act, modo, deltaDias, festivos = new Set(), limites = {}) {
  const { min, max } = limites;
  let { inicio_actividad: inicio, fin_actividad: fin } = act;
  const dur = Math.max(1, contarHabiles(inicio, fin, festivos));

  if (modo === 'move') {
    let delta = deltaDias;
    if (min && sumarDias(inicio, delta) < min) delta = diasCalendario(inicio, min) - 1;
    if (max && sumarDias(fin, delta) > max) delta = diasCalendario(fin, max) - 1;
    const ini = habilMasCercano(sumarDias(inicio, delta), festivos, delta >= 0 ? 1 : -1);
    inicio = ini;
    fin = sumarHabiles(ini, dur, festivos);
    if (max && fin > max) fin = habilMasCercano(max, festivos, -1);
  } else if (modo === 'start') {
    let ini = sumarDias(inicio, deltaDias);
    if (min && ini < min) ini = min;
    inicio = habilMasCercano(ini, festivos, 1);
    if (inicio > fin) inicio = habilMasCercano(fin, festivos, -1);
  } else {
    let f = sumarDias(fin, deltaDias);
    if (max && f > max) f = max;
    fin = habilMasCercano(f, festivos, -1);
    if (fin < inicio) fin = inicio;
  }
  return { inicio_actividad: inicio, fin_actividad: fin };
}
