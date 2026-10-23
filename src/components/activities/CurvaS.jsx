import React, { useMemo, useRef, useState } from 'react';
import { TrendingUp, ArrowUpCircle, ArrowDownCircle, MinusCircle, Plus, Trash2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { calcularCurvaS, calcularAvanceTotal, calcularPuntoEnFecha, getRangoFechasProyecto } from '../../lib/curvaS';

const CHART_W = 1000;
const CHART_H = 340;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;

const TOOLTIP_W = 152;
const TOOLTIP_H = 92;

const hoyActualStr = () => new Date().toISOString().split('T')[0];

export default function CurvaS({ activities }) {
  const chartRef = useRef(null);
  const [hoverPoint, setHoverPoint] = useState(null); // { x, y, fecha, programado, real }
  const [marcadorFecha, setMarcadorFecha] = useState(null);
  // Fecha de referencia ("hoy" por defecto) hasta la cual se dibuja el avance real.
  const [fechaCorte, setFechaCorte] = useState(hoyActualStr);

  const hayActividades = !!activities && activities.length > 0;

  // Los hooks van antes del return temprano (regla de React)
  const puntos = useMemo(() => (hayActividades ? calcularCurvaS(activities, { fechaCorte }) : []), [activities, fechaCorte]);
  const totales = useMemo(() => (hayActividades ? calcularAvanceTotal(activities, fechaCorte) : null), [activities, fechaCorte]);
  const marcadorPunto = useMemo(
    () => (hayActividades && marcadorFecha ? calcularPuntoEnFecha(activities, marcadorFecha, fechaCorte) : null),
    [activities, marcadorFecha, fechaCorte]
  );

  if (!hayActividades) return null;

  const { minDate, maxDate } = getRangoFechasProyecto(activities);

  const totalMs = Math.max(maxDate.getTime() - minDate.getTime(), 86400000);
  const plotW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

  const xForFecha = (fechaStr) => {
    const t = new Date(`${fechaStr}T00:00:00`).getTime();
    const frac = Math.max(0, Math.min(1, (t - minDate.getTime()) / totalMs));
    return PAD_LEFT + frac * plotW;
  };
  const yForValor = (valor) => PAD_TOP + (1 - valor / 100) * plotH;

  const pathProgramado = puntos.map((p) => `${xForFecha(p.fecha)},${yForValor(p.programado)}`).join(' ');
  const puntosReales = puntos.filter((p) => p.real !== null);
  const pathReal = puntosReales.map((p) => `${xForFecha(p.fecha)},${yForValor(p.real)}`).join(' ');

  const corteX = xForFecha(fechaCorte);
  const isCorteVisible = corteX > PAD_LEFT && corteX < PAD_LEFT + plotW;

  const desviacion = totales.avanceReal - totales.avanceProgramado;
  const desviacionColor = desviacion >= 1 ? '#10b981' : desviacion <= -1 ? '#f43f5e' : '#f59e0b';
  const DesviacionIcon = desviacion >= 1 ? ArrowUpCircle : desviacion <= -1 ? ArrowDownCircle : MinusCircle;

  const gridLevels = [0, 25, 50, 75, 100];

  // Etiquetas de fecha en el eje X: inicio, corte (si aplica) y fin
  const xLabels = [{ fecha: puntos[0].fecha, key: 'inicio' }];
  if (isCorteVisible) xLabels.push({ fecha: fechaCorte, key: 'corte' });
  xLabels.push({ fecha: puntos[puntos.length - 1].fecha, key: 'fin' });

  const minFechaStr = minDate.toISOString().split('T')[0];
  const maxFechaStr = maxDate.toISOString().split('T')[0];

  const handleAgregarMarcador = () => {
    const clamped = fechaCorte < minFechaStr ? minFechaStr : fechaCorte > maxFechaStr ? maxFechaStr : fechaCorte;
    setMarcadorFecha(clamped);
  };

  const mostrarTooltip = (fecha, x, y, programado, real) => {
    setHoverPoint({ fecha, x, y, programado, real });
  };
  const ocultarTooltip = () => setHoverPoint(null);

  // Captura el panel sin los elementos marcados con data-export-ignore (botones) y con el fondo del tema
  const capturar = () => toPng(chartRef.current, {
    filter: (n) => !n.dataset?.exportIgnore,
    backgroundColor: getComputedStyle(document.body).backgroundColor
  });

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await capturar();
      const link = document.createElement('a');
      link.download = 'curva_s.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting PNG', err);
    }
  };

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
        pdf.save('curva_s.pdf');
      };
    } catch (err) {
      console.error('Error exporting PDF', err);
    }
  };

  // Elemento de la leyenda: línea de color + texto
  const itemLeyenda = (color, texto) => (
    <span className="curva-leyenda-item">
      <span className="curva-leyenda-linea" style={{ background: color }} />
      {texto}
    </span>
  );

  return (
    <div ref={chartRef} className="glass-panel panel-grafico">

      {/* Cabecera: título e insignias de avance */}
      <div className="curva-cabecera">
        <div className="grupo-titulo">
          <TrendingUp size={20} color="#6366f1" />
          <h3 className="modal-titulo">Curva S de Avance del Proyecto</h3>
        </div>

        <div className="curva-insignias">
          <span className="badge badge-indigo">Programado: {totales.avanceProgramado.toFixed(1)}%</span>
          <span className="badge badge-emerald">Real: {totales.avanceReal.toFixed(1)}%</span>
          <span
            className="curva-desviacion"
            style={{ color: desviacionColor, background: `${desviacionColor}22`, border: `1px solid ${desviacionColor}55` }}
            title="Diferencia entre avance real y avance programado a la fecha"
          >
            <DesviacionIcon size={13} />
            {desviacion >= 0 ? '+' : ''}{desviacion.toFixed(1)}% vs. plan
          </span>
        </div>
      </div>

      {/* Fecha de corte (referencia para el avance real; por defecto hoy) */}
      <div className="curva-corte">
        <span className="curva-corte-titulo">Fecha de corte (avance real):</span>
        <input
          type="date"
          value={fechaCorte}
          min={minFechaStr}
          max={maxFechaStr}
          onChange={(e) => setFechaCorte(e.target.value)}
          className="curva-input-fecha corte"
        />
        {fechaCorte !== hoyActualStr() && (
          <button onClick={() => setFechaCorte(hoyActualStr())} className="curva-boton-hoy">
            Hoy
          </button>
        )}
      </div>

      {/* Exportación y marcador personalizado (se excluye de la imagen exportada) */}
      <div data-export-ignore className="curva-acciones">
        <button onClick={handleExportPNG} className="boton-exportar png">
          📷 Exportar PNG
        </button>
        <button onClick={handleExportPDF} className="boton-exportar pdf">
          📄 Exportar PDF
        </button>

        <div className="curva-separador" />

        {marcadorFecha ? (
          <>
            <input
              type="date"
              value={marcadorFecha}
              min={minFechaStr}
              max={maxFechaStr}
              onChange={(e) => setMarcadorFecha(e.target.value)}
              className="curva-input-fecha marcador"
            />
            <button onClick={() => setMarcadorFecha(null)} className="curva-boton-marcador">
              <Trash2 size={14} /> Eliminar Marcador
            </button>
          </>
        ) : (
          <button onClick={handleAgregarMarcador} className="curva-boton-marcador">
            <Plus size={14} /> Agregar Marcador
          </button>
        )}
      </div>

      {/* Leyenda */}
      <div className="curva-leyenda">
        {itemLeyenda('#6366f1', 'Avance Programado')}
        {itemLeyenda('#10b981', 'Avance Real')}
        {marcadorFecha && itemLeyenda('#f59e0b', `Marcador (${marcadorFecha})`)}
      </div>

      {/* Gráfico */}
      <div className="curva-desplazable">
        <div className="curva-lienzo">
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" height="360" className="curva-svg">

            {/* Líneas horizontales de la cuadrícula y etiquetas del eje Y */}
            {gridLevels.map((lvl) => (
              <g key={lvl}>
                <line
                  x1={PAD_LEFT} x2={CHART_W - PAD_RIGHT}
                  y1={yForValor(lvl)} y2={yForValor(lvl)}
                  stroke="var(--border-glass)" strokeWidth="1"
                />
                <text
                  x={PAD_LEFT - 8} y={yForValor(lvl) + 4}
                  textAnchor="end" fontSize="11" fill="var(--text-muted)"
                >
                  {lvl}%
                </text>
              </g>
            ))}

            {/* Etiquetas de fecha del eje X */}
            {xLabels.map((lbl) => (
              <text
                key={lbl.key}
                x={xForFecha(lbl.fecha)}
                y={CHART_H - PAD_BOTTOM + 20}
                textAnchor={lbl.key === 'inicio' ? 'start' : lbl.key === 'fin' ? 'end' : 'middle'}
                fontSize="11"
                fontWeight={lbl.key === 'corte' ? '700' : '400'}
                fill={lbl.key === 'corte' ? '#10b981' : 'var(--text-muted)'}
              >
                {lbl.fecha}
              </text>
            ))}

            {/* Línea vertical de corte (el avance real se dibuja hasta esta fecha) */}
            {isCorteVisible && (
              <line
                x1={corteX} x2={corteX}
                y1={PAD_TOP} y2={CHART_H - PAD_BOTTOM}
                stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3"
              />
            )}

            {/* Línea vertical del marcador personalizado (amarillo) */}
            {marcadorFecha && marcadorPunto && (
              <line
                x1={xForFecha(marcadorFecha)} x2={xForFecha(marcadorFecha)}
                y1={PAD_TOP} y2={CHART_H - PAD_BOTTOM}
                stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3"
              />
            )}

            {/* Curva programada */}
            <polyline
              points={pathProgramado}
              fill="none" stroke="#6366f1" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round"
            />

            {/* Curva real */}
            {puntosReales.length > 0 && (
              <polyline
                points={pathReal}
                fill="none" stroke="#10b981" strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round"
              />
            )}

            {/* Punto final del avance real (en la fecha de corte): al pasar el cursor muestra el recuadro */}
            {puntosReales.length > 0 && (() => {
              const ultimo = puntosReales[puntosReales.length - 1];
              const cx = xForFecha(ultimo.fecha);
              const cy = yForValor(ultimo.real);
              return (
                <circle
                  cx={cx} cy={cy} r="5"
                  fill="#10b981" stroke="#022c22" strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => mostrarTooltip(ultimo.fecha, cx, cy, totales.avanceProgramado, totales.avanceReal)}
                  onMouseLeave={ocultarTooltip}
                />
              );
            })()}

            {/* Punto del marcador personalizado (amarillo): al pasar el cursor muestra el recuadro */}
            {marcadorFecha && marcadorPunto && (() => {
              const cx = xForFecha(marcadorFecha);
              const cy = yForValor(marcadorPunto.programado);
              return (
                <circle
                  cx={cx} cy={cy} r="5"
                  fill="#f59e0b" stroke="#451a03" strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => mostrarTooltip(marcadorFecha, cx, cy, marcadorPunto.programado, marcadorPunto.real)}
                  onMouseLeave={ocultarTooltip}
                />
              );
            })()}

            {/* Recuadro flotante con real, programado y desviación del punto */}
            {hoverPoint && (() => {
              const puntoDesviacion = hoverPoint.real - hoverPoint.programado;
              const puntoDesvColor = puntoDesviacion >= 1 ? 'var(--accent-emerald)' : puntoDesviacion <= -1 ? 'var(--accent-rose)' : 'var(--accent-amber)';

              // Se mantiene dentro del gráfico y se coloca arriba del punto (o abajo si no cabe)
              let boxX = hoverPoint.x - TOOLTIP_W / 2;
              boxX = Math.max(PAD_LEFT - 4, Math.min(CHART_W - PAD_RIGHT - TOOLTIP_W + 4, boxX));

              let boxY = hoverPoint.y - TOOLTIP_H - 14;
              if (boxY < 0) boxY = hoverPoint.y + 14;

              return (
                <foreignObject x={boxX} y={boxY} width={TOOLTIP_W} height={TOOLTIP_H} style={{ pointerEvents: 'none', overflow: 'visible' }}>
                  <div xmlns="http://www.w3.org/1999/xhtml" className="curva-tooltip">
                    <div style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Real: {hoverPoint.real.toFixed(1)}%</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 700 }}>Programado: {hoverPoint.programado.toFixed(1)}%</div>
                    <div style={{ color: puntoDesvColor, fontWeight: 700 }}>
                      {puntoDesviacion >= 0 ? '+' : ''}{puntoDesviacion.toFixed(1)}% vs. plan
                    </div>
                    <div className="curva-tooltip-fecha">{hoverPoint.fecha}</div>
                  </div>
                </foreignObject>
              );
            })()}
          </svg>
        </div>
      </div>

    </div>
  );
}
