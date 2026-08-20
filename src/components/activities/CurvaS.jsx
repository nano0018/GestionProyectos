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

  if (!activities || activities.length === 0) return null;

  const { minDate, maxDate } = getRangoFechasProyecto(activities);
  const puntos = useMemo(() => calcularCurvaS(activities, { fechaCorte }), [activities, fechaCorte]);
  const totales = useMemo(() => calcularAvanceTotal(activities, fechaCorte), [activities, fechaCorte]);
  const marcadorPunto = useMemo(
    () => (marcadorFecha ? calcularPuntoEnFecha(activities, marcadorFecha, fechaCorte) : null),
    [activities, marcadorFecha, fechaCorte]
  );

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

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current);
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
      const dataUrl = await toPng(chartRef.current);
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

  return (
    <div ref={chartRef} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <TrendingUp size={20} color="#6366f1" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
            Curva S de Avance del Proyecto
          </h3>
        </div>

        {/* Stat badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className="badge badge-indigo">Programado: {totales.avanceProgramado.toFixed(1)}%</span>
          <span className="badge badge-emerald">Real: {totales.avanceReal.toFixed(1)}%</span>
          <span
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.72rem', fontWeight: 800, padding: '0.28rem 0.65rem',
              borderRadius: '9999px', color: desviacionColor,
              background: `${desviacionColor}22`, border: `1px solid ${desviacionColor}55`
            }}
            title="Diferencia entre avance real y avance programado a la fecha"
          >
            <DesviacionIcon size={13} />
            {desviacion >= 0 ? '+' : ''}{desviacion.toFixed(1)}% vs. plan
          </span>
        </div>
      </div>

      {/* Fecha de Corte (referencia para el avance real; por defecto hoy) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fecha de corte (avance real):</span>
        <input
          type="date"
          value={fechaCorte}
          min={minFechaStr}
          max={maxFechaStr}
          onChange={(e) => setFechaCorte(e.target.value)}
          style={{
            fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(0,0,0,0.25)',
            color: 'var(--text-main)', colorScheme: 'dark'
          }}
        />
        {fechaCorte !== hoyActualStr() && (
          <button
            onClick={() => setFechaCorte(hoyActualStr())}
            style={{
              background: 'transparent', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '0.3rem 0.7rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Hoy
          </button>
        )}
      </div>

      {/* Export Buttons + Marcador Custom */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={handleExportPNG}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px',
            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            boxShadow: '0 0 10px rgba(16,185,129,0.35)'
          }}
        >
          📷 Exportar PNG
        </button>
        <button
          onClick={handleExportPDF}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px',
            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            boxShadow: '0 0 10px rgba(99,102,241,0.35)'
          }}
        >
          📄 Exportar PDF
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border-glass)', margin: '0 0.25rem' }} />

        {marcadorFecha ? (
          <>
            <input
              type="date"
              value={marcadorFecha}
              min={minFechaStr}
              max={maxFechaStr}
              onChange={(e) => setMarcadorFecha(e.target.value)}
              style={{
                fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(0,0,0,0.25)',
                color: 'var(--text-main)', colorScheme: 'dark'
              }}
            />
            <button
              onClick={() => setMarcadorFecha(null)}
              style={{
                background: 'transparent', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)',
                padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}
            >
              <Trash2 size={14} /> Eliminar Marcador
            </button>
          </>
        ) : (
          <button
            onClick={handleAgregarMarcador}
            style={{
              background: 'transparent', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)',
              padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <Plus size={14} /> Agregar Marcador
          </button>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '18px', height: '3px', background: '#6366f1', display: 'inline-block', borderRadius: '2px' }} />
          Avance Programado
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '18px', height: '3px', background: '#10b981', display: 'inline-block', borderRadius: '2px' }} />
          Avance Real
        </span>
        {marcadorFecha && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '18px', height: '3px', background: '#f59e0b', display: 'inline-block', borderRadius: '2px' }} />
            Marcador ({marcadorFecha})
          </span>
        )}
      </div>

      {/* Chart */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ minWidth: '720px' }}>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" height="360" style={{ display: 'block', overflow: 'visible' }}>

            {/* Horizontal grid lines + Y labels */}
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

            {/* X axis date labels */}
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

            {/* Línea vertical de corte (avance real se dibuja hasta esta fecha) */}
            {isCorteVisible && (
              <line
                x1={corteX} x2={corteX}
                y1={PAD_TOP} y2={CHART_H - PAD_BOTTOM}
                stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3"
              />
            )}

            {/* Marcador custom vertical (amarillo) */}
            {marcadorFecha && marcadorPunto && (
              <line
                x1={xForFecha(marcadorFecha)} x2={xForFecha(marcadorFecha)}
                y1={PAD_TOP} y2={CHART_H - PAD_BOTTOM}
                stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3"
              />
            )}

            {/* Curva Programada */}
            <polyline
              points={pathProgramado}
              fill="none" stroke="#6366f1" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round"
            />

            {/* Curva Real */}
            {puntosReales.length > 0 && (
              <polyline
                points={pathReal}
                fill="none" stroke="#10b981" strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round"
              />
            )}

            {/* Punto final de avance real (hoy) — hover muestra tooltip */}
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

            {/* Punto del marcador custom (amarillo) — hover muestra tooltip */}
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

            {/* Tooltip flotante */}
            {hoverPoint && (() => {
              const puntoDesviacion = hoverPoint.real - hoverPoint.programado;
              const puntoDesvColor = puntoDesviacion >= 1 ? 'var(--accent-emerald)' : puntoDesviacion <= -1 ? 'var(--accent-rose)' : 'var(--accent-amber)';

              let boxX = hoverPoint.x - TOOLTIP_W / 2;
              boxX = Math.max(PAD_LEFT - 4, Math.min(CHART_W - PAD_RIGHT - TOOLTIP_W + 4, boxX));

              let boxY = hoverPoint.y - TOOLTIP_H - 14;
              if (boxY < 0) boxY = hoverPoint.y + 14;

              return (
                <foreignObject x={boxX} y={boxY} width={TOOLTIP_W} height={TOOLTIP_H} style={{ pointerEvents: 'none', overflow: 'visible' }}>
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      background: 'var(--modal-bg)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.65rem',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      lineHeight: 1.55,
                      boxShadow: 'var(--modal-shadow)'
                    }}
                  >
                    <div style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Real: {hoverPoint.real.toFixed(1)}%</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 700 }}>Programado: {hoverPoint.programado.toFixed(1)}%</div>
                    <div style={{ color: puntoDesvColor, fontWeight: 700 }}>
                      {puntoDesviacion >= 0 ? '+' : ''}{puntoDesviacion.toFixed(1)}% vs. plan
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{hoverPoint.fecha}</div>
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
