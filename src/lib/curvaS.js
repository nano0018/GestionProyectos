// Cálculos puros para la Curva S (avance programado vs. avance real) de un proyecto.
// Ponderación: cada actividad pesa según su duración (días) respecto a la duración total
// de todas las actividades del proyecto (no existe un campo "peso" explícito en el esquema).

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toDate = (str) => new Date(`${str}T00:00:00`);
const toFechaStr = (date) => date.toISOString().split('T')[0];
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const hoyStr = () => toFechaStr(new Date());

const duracionDias = (actividad) => {
  const dias = (toDate(actividad.fin_actividad).getTime() - toDate(actividad.inicio_actividad).getTime()) / MS_PER_DAY;
  return Math.max(dias, 0.1); // evita peso cero en actividades de 1 día
};

const pesosPorDuracion = (actividades) => {
  const duraciones = actividades.map(duracionDias);
  const total = duraciones.reduce((sum, d) => sum + d, 0);
  return duraciones.map((d) => d / total);
};

// Avance programado (%) de una actividad en una fecha dada: interpolación lineal
// entre 0% en inicio_actividad y 100% en fin_actividad.
export function avanceProgramadoActividad(actividad, fechaStr) {
  const inicio = toDate(actividad.inicio_actividad);
  const fin = toDate(actividad.fin_actividad);
  const fecha = toDate(fechaStr);

  if (fecha <= inicio) return 0;
  if (fecha >= fin) return 100;

  const totalMs = fin.getTime() - inicio.getTime();
  if (totalMs <= 0) return 100;

  return clamp(((fecha.getTime() - inicio.getTime()) / totalMs) * 100, 0, 100);
}

// Avance real (%) de una actividad en una fecha dada. Como avance_real solo guarda
// el valor actual (no un histórico), se asume una acumulación lineal desde 0 en
// inicio_actividad hasta alcanzar el avance_real registrado en min(fechaCorte, fin_actividad).
// `fechaCorte` es la fecha de referencia ("hoy" por defecto, pero configurable) hasta la
// cual se considera que el avance_real reportado es válido.
function avanceRealActividad(actividad, fechaStr, fechaCorte) {
  const inicio = toDate(actividad.inicio_actividad);
  const fin = toDate(actividad.fin_actividad);
  const fecha = toDate(fechaStr);
  const corte = toDate(fechaCorte);
  const avanceReal = clamp(Number(actividad.avance_real) || 0, 0, 100);

  if (fecha < inicio) return 0;

  const ancla = corte < fin ? corte : fin;
  if (ancla <= inicio) return avanceReal;

  const totalMs = ancla.getTime() - inicio.getTime();
  const transcurridoMs = Math.min(fecha.getTime(), ancla.getTime()) - inicio.getTime();

  return clamp((transcurridoMs / totalMs) * avanceReal, 0, 100);
}

// Avance programado y real (%) del proyecto completo en una fecha arbitraria (pasada,
// presente o futura), ponderado por duración de actividad. Para fechas posteriores a
// `fechaCorte`, el avance real se proyecta plano (se asume que se mantiene igual al
// valor registrado a la fecha de corte). `fechaCorte` por defecto es hoy.
export function calcularPuntoEnFecha(actividades, fechaStr, fechaCorte = hoyStr()) {
  if (!actividades || actividades.length === 0) {
    return { programado: 0, real: 0 };
  }

  const pesos = pesosPorDuracion(actividades);
  let programado = 0;
  let real = 0;
  actividades.forEach((act, idx) => {
    programado += pesos[idx] * avanceProgramadoActividad(act, fechaStr);
    real += pesos[idx] * avanceRealActividad(act, fechaStr, fechaCorte);
  });

  return {
    programado: clamp(programado, 0, 100),
    real: clamp(real, 0, 100)
  };
}

export function getRangoFechasProyecto(actividades) {
  const inicios = actividades.map((a) => toDate(a.inicio_actividad).getTime());
  const fines = actividades.map((a) => toDate(a.fin_actividad).getTime());
  return {
    minDate: new Date(Math.min(...inicios)),
    maxDate: new Date(Math.max(...fines))
  };
}

// Avance total acumulado del proyecto a la fecha de corte (hoy por defecto),
// ponderado por duración de actividad.
export function calcularAvanceTotal(actividades, fechaCorte = hoyStr()) {
  if (!actividades || actividades.length === 0) {
    return { avanceProgramado: 0, avanceReal: 0 };
  }

  const pesos = pesosPorDuracion(actividades);

  let avanceProgramado = 0;
  let avanceReal = 0;
  actividades.forEach((act, idx) => {
    avanceProgramado += pesos[idx] * avanceProgramadoActividad(act, fechaCorte);
    avanceReal += pesos[idx] * clamp(Number(act.avance_real) || 0, 0, 100);
  });

  return {
    avanceProgramado: clamp(avanceProgramado, 0, 100),
    avanceReal: clamp(avanceReal, 0, 100)
  };
}

// Serie de puntos {fecha, programado, real} muestreados a lo largo de todo el
// cronograma del proyecto. `real` es null para fechas posteriores a `fechaCorte`
// (no hay dato real aún a partir de ese punto). `fechaCorte` por defecto es hoy.
export function calcularCurvaS(actividades, opts = {}) {
  if (!actividades || actividades.length === 0) return [];

  const { minDate, maxDate } = getRangoFechasProyecto(actividades);
  const totalDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / MS_PER_DAY));
  const numPuntos = opts.numPuntos || Math.min(40, Math.max(10, totalDays));
  const stepDays = Math.max(1, Math.round(totalDays / numPuntos));

  const fechaCorte = opts.fechaCorte || hoyStr();

  // Fechas muestreadas a intervalos regulares, más los extremos y `fechaCorte` exactos
  // (para que el círculo/línea de avance real quede alineado con la línea de corte).
  const fechasSet = new Set();
  for (let i = 0; i <= totalDays; i += stepDays) {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    fechasSet.add(toFechaStr(d));
  }
  fechasSet.add(toFechaStr(minDate));
  fechasSet.add(toFechaStr(maxDate));
  if (fechaCorte >= toFechaStr(minDate) && fechaCorte <= toFechaStr(maxDate)) {
    fechasSet.add(fechaCorte);
  }

  return Array.from(fechasSet)
    .sort()
    .map((fechaStr) => {
      const { programado, real } = calcularPuntoEnFecha(actividades, fechaStr, fechaCorte);
      return {
        fecha: fechaStr,
        programado,
        real: fechaStr <= fechaCorte ? real : null
      };
    });
}
