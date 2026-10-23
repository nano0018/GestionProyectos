import React, { useState, useRef } from 'react';
import { Clock, Flag } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { inicioMinimo } from '../../lib/dependencias';
import { contarHabiles, moverBarra, setFestivos } from '../../lib/diasHabiles';

const ROW_H = 50;
const ROW_GAP = 14;

export default function GanttChart({ activities, festivos = [], plazo = null, canEdit = false, onConfirmChanges }) {
  const [scaleMode, setScaleMode] = useState('dias'); // 'dias' | 'semanas' | 'meses'
  const [drag, setDrag] = useState(null); // { id, modo, startX, ancho, base, fechas } mientras se arrastra una barra
  const [editando, setEditando] = useState(false); // modo edición: las barras se pueden arrastrar
  const [borrador, setBorrador] = useState({}); // cambios sin confirmar: { id_actividad: { inicio_actividad, fin_actividad } }
  const chartRef = useRef(null);
  const rowsRef = useRef(null);

  if (!activities || activities.length === 0) return null;

  // Sort activities by start date
  // El orden de las filas se fija con las fechas guardadas; las barras muestran el borrador y, si se arrastran, las fechas provisionales
  const sorted = [...activities]
    .sort((a, b) => new Date(a.inicio_actividad).getTime() - new Date(b.inicio_actividad).getTime())
    .map((a) => {
      if (drag && drag.id === a.id_actividad) return { ...a, ...drag.fechas };
      return borrador[a.id_actividad] ? { ...a, ...borrador[a.id_actividad] } : a;
    });
  const cantidadCambios = Object.keys(borrador).length;
  const fest = setFestivos(festivos);
  const limites = plazo?.definido ? { min: plazo.inicio, max: plazo.fin } : {};

  // Find min start date and max end date among activities
  const minDate = new Date(Math.min(...sorted.map(a => new Date(a.inicio_actividad).getTime()), ...(plazo?.definido ? [new Date(plazo.inicio).getTime()] : [])));
  const calculatedMaxEndMs = Math.max(...sorted.map(a => new Date(a.fin_actividad).getTime()), ...(plazo?.definido ? [new Date(plazo.fin).getTime()] : []));
  const calculatedMaxEndDate = new Date(calculatedMaxEndMs);

  // Deadline: fin del proyecto si está definido, o la fecha de fin más lejana de las actividades
  const deadlineDateStr = calculatedMaxEndDate.toISOString().split('T')[0];
  const inicioDateStr = minDate.toISOString().split('T')[0];
  const deadlineDateObj = new Date(deadlineDateStr);

  // Ensure overall timeline display spans past deadline date
  const maxDate = new Date(Math.max(calculatedMaxEndMs, deadlineDateObj.getTime()));
  maxDate.setDate(maxDate.getDate() + 2); // padding

  const totalTimeMs = Math.max(maxDate.getTime() - minDate.getTime(), 86400000);
  const totalDays = Math.max(Math.ceil(totalTimeMs / (1000 * 60 * 60 * 24)), 1);

  // Calculate percentage along overall project timeline
  const getPositionPercent = (dateStr) => {
    const d = new Date(dateStr);
    const diffMs = d.getTime() - minDate.getTime();
    return Math.max(0, Math.min(100, (diffMs / totalTimeMs) * 100));
  };

  const getDurationDays = (startStr, endStr) => {
    return Math.max(1, contarHabiles(startStr, endStr, fest)); // días hábiles
  };

  // Format Duration according to active scale
  const formatDurationText = (days) => {
    if (scaleMode === 'semanas') {
      const weeks = (days / 5).toFixed(1);
      return `${weeks} sem`;
    }
    if (scaleMode === 'meses') {
      const months = (days / 21).toFixed(1);
      return `${months} mes`;
    }
    return `${days}d`;
  };

  // Generate Scale Column Headers & Grid Lines
  const generateScaleColumns = () => {
    const columns = [];

    if (scaleMode === 'dias') {
      const stepDays = Math.max(1, Math.ceil(totalDays / 14));
      for (let i = 0; i <= totalDays; i += stepDays) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        columns.push({
          label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          percent: (i / totalDays) * 100
        });
      }
    } else if (scaleMode === 'semanas') {
      let weekNum = 1;
      for (let i = 0; i < totalDays; i += 7) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        columns.push({
          label: `Sem ${weekNum} (${d.getDate()}/${d.getMonth() + 1})`,
          percent: (i / totalDays) * 100
        });
        weekNum++;
      }
    } else if (scaleMode === 'meses') {
      const startYear = minDate.getFullYear();
      const startMonth = minDate.getMonth();
      const endYear = maxDate.getFullYear();
      const endMonth = maxDate.getMonth();

      let monthCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      monthCount = Math.max(monthCount, 1);

      for (let m = 0; m < monthCount; m++) {
        const d = new Date(startYear, startMonth + m, 1);
        const diffMs = d.getTime() - minDate.getTime();
        const percent = Math.max(0, Math.min(100, (diffMs / totalTimeMs) * 100));

        columns.push({
          label: d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          percent
        });
      }
    }

    return columns;
  };

  const scaleColumns = generateScaleColumns();
  // Se muestra solo cada n-ésima etiqueta para que no se amontonen
  // (la grilla vertical usa las mismas columnas).
  const maxEtiquetas = scaleMode === 'semanas' ? 5 : scaleMode === 'meses' ? 6 : 8;
  const labelStride = Math.max(1, Math.ceil(scaleColumns.length / maxEtiquetas));
  const deadlinePercent = getPositionPercent(deadlineDateStr);

  // Flechas de dependencia: una por cada par (predecesora -> actividad). Conflicto si la
  // actividad empieza antes de que termine su predecesora.
  const finBarra = (a) => {
    const l = getPositionPercent(a.inicio_actividad);
    return l + Math.max(getPositionPercent(a.fin_actividad) - l, 4);
  };
  const filaDe = new Map(sorted.map((a, i) => [a.id_actividad, i]));
  const flechas = sorted.flatMap((a, i) =>
    (a.actividades_predecesoras || [])
      .filter((p) => filaDe.has(p))
      .map((p) => {
        const pred = sorted[filaDe.get(p)];
        return {
          key: `${p}-${a.id_actividad}`,
          x1: finBarra(pred),
          y1: filaDe.get(p) * (ROW_H + ROW_GAP) + ROW_H / 2,
          x2: getPositionPercent(a.inicio_actividad),
          y2: i * (ROW_H + ROW_GAP) + ROW_H / 2,
          conflicto: a.inicio_actividad < inicioMinimo(a, pred)
        };
      })
  );

  // Arrastre de barras: 'move' mueve conservando los días hábiles, 'start'/'end' cambian un extremo
  const iniciarArrastre = (e, act, modo) => {
    if (!canEdit || !editando || !rowsRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ancho = rowsRef.current.getBoundingClientRect().width - 300;
    const base = { inicio_actividad: act.inicio_actividad, fin_actividad: act.fin_actividad };
    setDrag({ id: act.id_actividad, modo, startX: e.clientX, ancho, base, fechas: base });
  };

  const moverArrastre = (e, act) => {
    if (!drag || drag.id !== act.id_actividad) return;
    const delta = Math.round(((e.clientX - drag.startX) / drag.ancho) * (totalTimeMs / 86400000));
    setDrag({ ...drag, fechas: moverBarra({ ...act, ...drag.base }, drag.modo, delta, fest, limites) });
  };

  // Al soltar, el resultado queda en el borrador (sin guardar); si vuelve a las fechas guardadas se descarta
  const terminarArrastre = (act) => {
    if (!drag || drag.id !== act.id_actividad) return;
    const original = activities.find((a) => a.id_actividad === act.id_actividad);
    const { fechas } = drag;
    setDrag(null);
    const igualAlGuardado = fechas.inicio_actividad === original.inicio_actividad && fechas.fin_actividad === original.fin_actividad;
    setBorrador((prev) => {
      const { [act.id_actividad]: _descartada, ...resto } = prev;
      return igualAlGuardado ? resto : { ...resto, [act.id_actividad]: fechas };
    });
  };

  // Sale del modo edición descartando el borrador
  const cancelarEdicion = () => {
    setDrag(null);
    setBorrador({});
    setEditando(false);
  };

  // Envía los cambios del borrador para guardarlos y sale del modo edición
  const confirmarEdicion = () => {
    const cambios = Object.entries(borrador).map(([id, fechas]) => ({
      ...activities.find((a) => a.id_actividad === Number(id)),
      ...fechas
    }));
    if (cambios.length > 0) onConfirmChanges(cambios);
    cancelarEdicion();
  };

  // Captura el panel sin los elementos marcados con data-export-ignore (botones de exportación)
  // El panel es translúcido: se le da el fondo del body para que PNG/PDF no queden sobre blanco (modo oscuro más claro).
  const capturar = () => toPng(chartRef.current, {
    filter: (n) => !n.dataset?.exportIgnore,
    backgroundColor: getComputedStyle(document.body).backgroundColor
  });

  // Export as PNG
  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await capturar();
      const link = document.createElement('a');
      link.download = 'gantt_diagram.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting PNG', err);
    }
  };

  // Export as PDF
  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await capturar();
      const pdf = new jsPDF('landscape');
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('gantt_diagram.pdf');
      };
    } catch (err) {
      console.error('Error exporting PDF', err);
    }
  };

  // Today line percentage
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPercent = getPositionPercent(todayStr);
  const isTodayVisible = todayPercent > 0 && todayPercent < 100;

  // Posición horizontal (CSS) de una línea vertical dentro del área de barras, desde un % del eje de tiempo
  const posicionLinea = (percent) => `calc(300px + (100% - 300px) * ${percent / 100})`;

  // Pastilla del selector de escala
  const botonEscala = (modo, texto) => (
    <button
      onClick={() => setScaleMode(modo)}
      className={`gantt-escala-boton${scaleMode === modo ? ' activo' : ''}`}
    >
      {texto}
    </button>
  );

  return (
    <div ref={chartRef} className="glass-panel panel-grafico">

      {/* Cabecera: título y selector de escala */}
      <div className="gantt-cabecera">
        <div className="grupo-titulo">
          <Clock size={20} color="#6366f1" />
          <h3 className="modal-titulo">Diagrama de Gantt y Cronograma</h3>
        </div>

        <div className="gantt-controles">
          <div className="gantt-escala">
            <span className="gantt-escala-titulo">Escala:</span>
            <div className="gantt-escala-pastillas">
              {botonEscala('dias', 'Días')}
              {botonEscala('semanas', 'Semanas')}
              {botonEscala('meses', 'Meses')}
            </div>
          </div>
        </div>
      </div>

      {/* Botones de exportación (se excluyen de la imagen exportada) */}
      <div data-export-ignore className="fila-exportar">
        {/* Edición del cronograma arrastrando las barras (no se guarda hasta confirmar) */}
        {canEdit && !editando && (
          <button onClick={() => setEditando(true)} className="boton-exportar editar">
            ✏️ Editar Gantt
          </button>
        )}
        {editando && (
          <>
            <button onClick={confirmarEdicion} className="boton-exportar confirmar">
              ✔ Confirmar cambios{cantidadCambios > 0 ? ` (${cantidadCambios})` : ''}
            </button>
            <button onClick={cancelarEdicion} className="boton-exportar cancelar">
              ✖ Cancelar
            </button>
            <span className="gantt-aviso-edicion">
              Arrastra una barra para moverla o sus extremos para cambiar inicio / fin.
            </span>
          </>
        )}

        <button onClick={handleExportPNG} className="boton-exportar png">
          📷 Exportar PNG
        </button>
        <button onClick={handleExportPDF} className="boton-exportar pdf">
          📄 Exportar PDF
        </button>
      </div>

      {/* Contenedor con scroll horizontal del cronograma */}
      <div className="gantt-desplazable">
        <div className="gantt-lienzo">

          {/* Encabezado: título de la columna de nombres + marcas de la escala de tiempo */}
          <div className="gantt-encabezado">
            <span className="gantt-encabezado-titulo">Actividad (#ID)</span>

            <div className="gantt-marcas">
              {scaleColumns.map((col, idx) => (
                // La marca 0 no se dibuja: ya la representa la bandera amarilla de INICIO
                idx === 0 || idx % labelStride !== 0 ? null : (
                  <div key={idx} className="gantt-marca" style={{ left: `${col.percent}%` }}>
                    {col.label}
                    <span className="gantt-marca-tick" />
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Filas de actividades y capas superpuestas (flechas, líneas e insignias) */}
          <div ref={rowsRef} className="gantt-filas" style={{ gap: `${ROW_GAP}px` }}>

            {/* Flechas de dependencia (fin de la predecesora -> inicio de la dependiente) */}
            <svg className="gantt-flechas" style={{ height: sorted.length * (ROW_H + ROW_GAP) }}>
              <defs>
                {/* Puntas de flecha: normal (gris) y en conflicto (rojo) */}
                {[['ok', '#94a3b8'], ['mal', '#f43f5e']].map(([k, c]) => (
                  <marker key={k} id={`flecha-${k}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                    <path d="M0,0 L7,3.5 L0,7 z" fill={c} />
                  </marker>
                ))}
              </defs>
              {flechas.map((f) => (
                <line key={f.key} x1={`${f.x1}%`} y1={f.y1} x2={`${f.x2}%`} y2={f.y2}
                  stroke={f.conflicto ? '#f43f5e' : '#94a3b8'} strokeWidth="1.5" strokeDasharray="4 3"
                  markerEnd={`url(#flecha-${f.conflicto ? 'mal' : 'ok'})`} />
              ))}
            </svg>

            {/* Una fila por actividad */}
            {sorted.map((act) => {
              const leftPercent = getPositionPercent(act.inicio_actividad);
              const rightPercent = getPositionPercent(act.fin_actividad);
              const widthPercent = Math.max(rightPercent - leftPercent, 4);
              const days = getDurationDays(act.inicio_actividad, act.fin_actividad);
              const durationLabel = formatDurationText(days);
              const arrastrando = drag?.id === act.id_actividad;

              // Eventos de arrastre compartidos por el cuerpo de la barra y sus asas
              const eventosArrastre = (modo) => ({
                onPointerDown: (e) => iniciarArrastre(e, act, modo),
                onPointerMove: (e) => moverArrastre(e, act),
                onPointerUp: () => terminarArrastre(act),
                onPointerCancel: () => setDrag(null)
              });

              return (
                <div key={act.id_actividad} className="gantt-fila" style={{ minHeight: `${ROW_H}px` }}>
                  {/* Etiqueta: ID y nombre de la actividad */}
                  <div className="gantt-etiqueta">
                    <span className="gantt-etiqueta-id">#{act.id_actividad}</span>
                    <span className="gantt-etiqueta-nombre">{act.nombre_actividad}</span>
                  </div>

                  {/* Pista de la barra, con la cuadrícula vertical de la escala */}
                  <div className="gantt-pista" style={{ height: `${ROW_H}px` }}>
                    {scaleColumns.map((col, idx) => (
                      idx % labelStride !== 0 ? null : (
                        <div key={idx} className="gantt-guia" style={{ left: `${col.percent}%` }} />
                      )
                    ))}

                    {/* Barra de la actividad: arrastrable para moverla */}
                    <div
                      {...eventosArrastre('move')}
                      className={`gantt-barra${borrador[act.id_actividad] ? ' pendiente' : ''}`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        cursor: editando ? (arrastrando ? 'grabbing' : 'grab') : 'default'
                      }}
                      title={`${act.nombre_actividad} (${days} días hábiles: ${act.inicio_actividad} al ${act.fin_actividad})`}
                    >
                      {/* Asas de los extremos: cambian el inicio o el fin */}
                      {editando && ['start', 'end'].map((lado) => (
                        <span
                          key={lado}
                          {...eventosArrastre(lado)}
                          className={`gantt-asa ${lado === 'start' ? 'inicio' : 'fin'}`}
                        />
                      ))}

                      {/* Duración en días hábiles (o semanas / meses según la escala) */}
                      <span className="gantt-barra-duracion">{durationLabel}</span>

                      {/* Predecesoras de la actividad */}
                      {act.actividades_predecesoras?.length > 0 && (
                        <span className="gantt-barra-predecesoras">
                          Pre: [{act.actividades_predecesoras.join(';')}]
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Líneas verticales: deadline, inicio y hoy */}
            <div className="gantt-linea deadline" style={{ left: posicionLinea(deadlinePercent) }} />
            <div className="gantt-linea inicio" />
            {isTodayVisible && <div className="gantt-linea hoy" style={{ left: posicionLinea(todayPercent) }} />}

            {/* Insignias con el texto de cada línea */}
            <div className="gantt-insignia con-icono deadline" style={{ left: posicionLinea(deadlinePercent) }}>
              <Flag size={10} />
              <span>DEADLINE ({deadlineDateStr})</span>
            </div>

            <div className="gantt-insignia con-icono inicio">
              <Flag size={10} />
              <span>INICIO ({inicioDateStr})</span>
            </div>

            {isTodayVisible && (
              <div className="gantt-insignia hoy" style={{ left: posicionLinea(todayPercent) }}>
                HOY
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}
