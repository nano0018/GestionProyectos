import React, { useState, useRef } from 'react';
import { Calendar, Clock, Flag, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function GanttChart({ activities }) {
  const [scaleMode, setScaleMode] = useState('dias'); // 'dias' | 'semanas' | 'meses'
  const chartRef = useRef(null);

  if (!activities || activities.length === 0) return null;

  // Sort activities by start date
  const sorted = [...activities].sort((a, b) =>
    new Date(a.inicio_actividad).getTime() - new Date(b.inicio_actividad).getTime()
  );

  // Find min start date and max end date among activities
  const minDate = new Date(Math.min(...sorted.map(a => new Date(a.inicio_actividad).getTime())));
  const calculatedMaxEndMs = Math.max(...sorted.map(a => new Date(a.fin_actividad).getTime()));
  const calculatedMaxEndDate = new Date(calculatedMaxEndMs);

  // Deadline is always the farthest end date among activities
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
    const s = new Date(startStr);
    const e = new Date(endStr);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  // Format Duration according to active scale
  const formatDurationText = (days) => {
    if (scaleMode === 'semanas') {
      const weeks = (days / 7).toFixed(1);
      return `${weeks} sem`;
    }
    if (scaleMode === 'meses') {
      const months = (days / 30).toFixed(1);
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
  const deadlinePercent = getPositionPercent(deadlineDateStr);

  // Export as PNG
  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current);
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
      const dataUrl = await toPng(chartRef.current);
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

  return (
    <div ref={chartRef} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>

      {/* Header Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Clock size={20} color="#6366f1" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
            Diagrama de Gantt y Cronograma
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>

          {/* SCALE MODE TOGGLE PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Escala:</span>

            <div style={{ display: 'flex', background: 'var(--bg-glass)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
              <button
                onClick={() => setScaleMode('dias')}
                style={{
                  background: scaleMode === 'dias' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                  color: scaleMode === 'dias' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Días
              </button>

              <button
                onClick={() => setScaleMode('semanas')}
                style={{
                  background: scaleMode === 'semanas' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                  color: scaleMode === 'semanas' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Semanas
              </button>

              <button
                onClick={() => setScaleMode('meses')}
                style={{
                  background: scaleMode === 'meses' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                  color: scaleMode === 'meses' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Meses
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Export Buttons Row */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={handleExportPNG}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            color: '#fff',
            border: 'none',
            padding: '0.4rem 1rem',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 0 10px rgba(16,185,129,0.35)',
            transition: 'all 0.2s ease'
          }}
        >
          📷 Exportar PNG
        </button>
        <button
          onClick={handleExportPDF}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#fff',
            border: 'none',
            padding: '0.4rem 1rem',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 0 10px rgba(99,102,241,0.35)',
            transition: 'all 0.2s ease'
          }}
        >
          📄 Exportar PDF
        </button>
      </div>

      {/* Gantt Timeline Container */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.75rem' }}>
        <div style={{ minWidth: '720px' }}>

          {/* Header Row Ticks */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', alignSelf: 'flex-end' }}>
              Actividad (#ID)
            </span>

            {/* Dynamic Scale Column Labels */}
            <div style={{ position: 'relative', height: scaleMode === 'dias' ? '56px' : '24px', width: '100%' }}>
              {scaleColumns.map((col, idx) => (
                // Skip idx=0 — it's shown as the yellow START flag in the timeline area
                idx === 0 ? null : (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${col.percent}%`,
                      bottom: 0,
                      transform: scaleMode === 'dias'
                        ? 'translateX(-100%) rotate(-45deg)'
                        : 'translateX(-50%)',
                      transformOrigin: scaleMode === 'dias' ? 'right bottom' : 'center bottom',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: scaleMode === 'dias' ? 'flex-start' : 'center',
                      gap: '2px',
                    }}
                  >
                    {col.label}
                    {/* Tick mark line below label */}
                    {scaleMode !== 'dias' && (
                      <span style={{ display: 'block', width: '1px', height: '5px', background: 'var(--border-active)', marginTop: '2px' }} />
                    )}
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Activity Rows with Timeline Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.85rem', position: 'relative', paddingBottom: '3.5rem' }}>

            {sorted.map((act) => {
              const leftPercent = getPositionPercent(act.inicio_actividad);
              const rightPercent = getPositionPercent(act.fin_actividad);
              const widthPercent = Math.max(rightPercent - leftPercent, 4);
              const days = getDurationDays(act.inicio_actividad, act.fin_actividad);
              const durationLabel = formatDurationText(days);

              return (
                <div
                  key={act.id_actividad}
                  style={{ display: 'grid', gridTemplateColumns: '300px 1fr', alignItems: 'center', minHeight: '50px' }}
                >
                  {/* Left Label */}
                  <div style={{ paddingRight: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem', marginRight: '0.4rem' }}>
                      #{act.id_actividad}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500, wordBreak: 'break-word', whiteSpace: 'normal', display: 'inline' }}>
                      {act.nombre_actividad}
                    </span>
                  </div>

                  {/* Right Bar Area with Vertical Guides & Deadline Line */}
                  <div style={{
                    position: 'relative',
                    height: '50px',
                    background: 'var(--bg-glass)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    overflow: 'visible'
                  }}>

                    {/* Vertical Scale Grid Lines */}
                    {scaleColumns.map((col, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'absolute',
                          left: `${col.percent}%`,
                          top: 0,
                          bottom: 0,
                          width: '1px',
                          background: 'var(--border-glass)',
                          pointerEvents: 'none'
                        }}
                      />
                    ))}

                    {/* Gantt Bar */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        top: '4px',
                        bottom: '4px',
                        background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)',
                        borderRadius: '6px',
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 0.6rem',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        zIndex: 2
                      }}
                      title={`${act.nombre_actividad} (${days} días: ${act.inicio_actividad} al ${act.fin_actividad})`}
                    >
                      <span>{durationLabel}</span>
                      {act.actividades_predecesoras?.length > 0 && (
                        <span style={{ opacity: 0.85, fontSize: '0.68rem', marginLeft: '0.3rem' }}>
                          Pre: [{act.actividades_predecesoras.join(';')}]
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

            {/* DEADLINE vertical line — ends at badge center */}
            <div
              style={{
                position: 'absolute',
                left: `calc(300px + (100% - 300px) * ${deadlinePercent / 100})`,
                top: '0px',
                bottom: '17px',
                width: '2px',
                background: '#f43f5e',
                boxShadow: '0 0 12px #f43f5e',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            />

            {/* INICIO vertical line — ends at badge center */}
            <div
              style={{
                position: 'absolute',
                left: '300px',
                top: '0px',
                bottom: '17px',
                width: '2px',
                background: '#f59e0b',
                boxShadow: '0 0 10px #f59e0b',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            />

            {/* HOY vertical line — ends at badge center */}
            {isTodayVisible && (
              <div
                style={{
                  position: 'absolute',
                  left: `calc(300px + (100% - 300px) * ${todayPercent / 100})`,
                  top: '0px',
                  bottom: '42px',
                  width: '2px',
                  background: '#10b981',
                  boxShadow: '0 0 10px #10b981',
                  zIndex: 9,
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* DEADLINE badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '5px',
                left: `calc(300px + (100% - 300px) * ${deadlinePercent / 100})`,
                transform: 'translateX(-50%)',
                background: '#f43f5e',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.18rem 0.5rem',
                borderRadius: '9999px',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 12px rgba(244, 63, 94, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                zIndex: 12,
                pointerEvents: 'none'
              }}
            >
              <Flag size={10} />
              <span>DEADLINE ({deadlineDateStr})</span>
            </div>

            {/* INICIO badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '5px',
                left: '300px',
                background: '#f59e0b',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.18rem 0.5rem',
                borderRadius: '9999px',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                zIndex: 12,
                pointerEvents: 'none'
              }}
            >
              <Flag size={10} />
              <span>INICIO ({inicioDateStr})</span>
            </div>

            {/* HOY badge */}
            {isTodayVisible && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '30px',
                  left: `calc(300px + (100% - 300px) * ${todayPercent / 100})`,
                  transform: 'translateX(-50%)',
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                  zIndex: 12,
                  pointerEvents: 'none'
                }}
              >
                HOY
              </div>
            )}

          </div>

        </div>
      </div>

    </div>
  );
}
