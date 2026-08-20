import React, { useState } from 'react';
import { Calendar, ArrowRight, Edit3, Trash2, Link, ListFilter, Check, X, Pencil } from 'lucide-react';
import { avanceProgramadoActividad } from '../../lib/curvaS';

const dateInputStyle = {
  fontSize: '0.78rem',
  padding: '0.25rem 0.4rem',
  borderRadius: '6px',
  border: '1px solid var(--border-glass)',
  background: 'rgba(0,0,0,0.25)',
  color: 'var(--text-main)',
  colorScheme: 'dark'
};

const iconBtnStyle = (color) => ({
  background: 'none',
  border: 'none',
  color,
  cursor: 'pointer',
  padding: '0.15rem',
  display: 'flex',
  alignItems: 'center'
});

const barraAvance = (valor, color) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '110px' }}>
    <div style={{ flex: 1, height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ width: `${valor}%`, height: '100%', background: color, borderRadius: '4px' }} />
    </div>
    <span style={{ fontSize: '0.75rem', fontWeight: 700, color, minWidth: '32px', textAlign: 'right' }}>
      {valor.toFixed(0)}%
    </span>
  </div>
);

export default function ActivityList({
  activities,
  onEditActivity,
  onDeleteActivity,
  onQuickUpdateActivity,
  currentUser,
  canEdit
}) {
  // Edición inline: { id, field: 'avance' | 'fin' | 'avanceReal' } de la celda activa (una a la vez)
  const [editing, setEditing] = useState(null);
  const [draftInicio, setDraftInicio] = useState('');
  const [draftFin, setDraftFin] = useState('');
  const [draftAvanceReal, setDraftAvanceReal] = useState('');
  const [fieldError, setFieldError] = useState('');

  const startEditAvance = (act) => {
    setEditing({ id: act.id, field: 'avance' });
    setDraftInicio(act.inicio_actividad);
    setDraftFin(act.fin_actividad);
    setFieldError('');
  };

  const startEditFin = (act) => {
    setEditing({ id: act.id, field: 'fin' });
    setDraftFin(act.fin_actividad);
    setFieldError('');
  };

  const startEditAvanceReal = (act) => {
    setEditing({ id: act.id, field: 'avanceReal' });
    setDraftAvanceReal(String(Number(act.avance_real) || 0));
    setFieldError('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setFieldError('');
  };

  const saveEdit = (act) => {
    if (editing.field === 'avanceReal') {
      const num = parseFloat(draftAvanceReal);
      if (Number.isNaN(num)) {
        setFieldError('Ingrese un número válido.');
        return;
      }
      if (num < 0 || num > 100) {
        setFieldError('El avance real debe estar entre 0 y 100.');
        return;
      }
      onQuickUpdateActivity({ ...act, avance_real: num });
      setEditing(null);
      setFieldError('');
      return;
    }

    const nuevoInicio = editing.field === 'avance' ? draftInicio : act.inicio_actividad;
    const nuevoFin = draftFin;

    if (!nuevoInicio || !nuevoFin) {
      setFieldError('Debe indicar ambas fechas.');
      return;
    }
    if (nuevoFin < nuevoInicio) {
      setFieldError('La fecha de fin no puede ser anterior al inicio.');
      return;
    }

    onQuickUpdateActivity({
      ...act,
      inicio_actividad: nuevoInicio,
      fin_actividad: nuevoFin
    });
    setEditing(null);
    setFieldError('');
  };

  const handleEditKeyDown = (e, act) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(act);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  if (activities.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(17,24,39,0.4)', borderRadius: '16px', border: '1px border-dashed var(--border-glass)' }}>
        <ListFilter size={40} color="var(--text-subtle)" style={{ marginBottom: '1rem' }} />
        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Aún no hay actividades en este proyecto</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
          Haz clic en "Nueva Actividad" para comenzar a planificar el cronograma.
        </p>
      </div>
    );
  }

  // Format array [1, 2] to user's desired string representation [1;2;...]
  const formatList = (arr) => {
    if (!arr || arr.length === 0) return '-';
    return `[${arr.join(';')}]`;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
        <thead>
          <tr style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem 1rem' }}>ID</th>
            <th style={{ padding: '0.75rem 1rem' }}>Actividad</th>
            <th style={{ padding: '0.75rem 1rem' }}>Predecesoras</th>
            <th style={{ padding: '0.75rem 1rem' }}>Dependientes</th>
            <th style={{ padding: '0.75rem 1rem' }}>Inicio</th>
            <th style={{ padding: '0.75rem 1rem' }}>Fin</th>
            <th style={{ padding: '0.75rem 1rem' }}>Avance Programado</th>
            <th style={{ padding: '0.75rem 1rem' }}>Avance Real</th>
            {canEdit && <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {activities.map((act) => (
            <tr 
              key={act.id_actividad}
              className="glass-card"
              style={{ transition: 'all 0.2s ease' }}
            >
              {/* ID Actividad */}
              <td style={{ padding: '1rem', fontWeight: 800, color: '#a5b4fc', fontSize: '1rem' }}>
                #{act.id_actividad}
              </td>

              {/* Nombre */}
              <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {act.nombre_actividad}
              </td>

              {/* Predecesoras */}
              <td style={{ padding: '1rem' }}>
                <span className="badge badge-amber">
                  {formatList(act.actividades_predecesoras)}
                </span>
              </td>

              {/* Dependientes */}
              <td style={{ padding: '1rem' }}>
                <span className="badge badge-indigo">
                  {formatList(act.actividades_dependientes)}
                </span>
              </td>

              {/* Fecha Inicio */}
              <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} color="#6ee7b7" />
                  <span>{act.inicio_actividad}</span>
                </div>
              </td>

              {/* Fecha Fin (editable inline) */}
              <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {editing?.id === act.id && editing.field === 'fin' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <input
                        type="date"
                        autoFocus
                        value={draftFin}
                        onChange={(e) => setDraftFin(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, act)}
                        style={dateInputStyle}
                      />
                      <button onClick={() => saveEdit(act)} style={iconBtnStyle('#10b981')} title="Guardar">
                        <Check size={16} />
                      </button>
                      <button onClick={cancelEdit} style={iconBtnStyle('#f43f5e')} title="Cancelar">
                        <X size={16} />
                      </button>
                    </div>
                    {fieldError && (
                      <span style={{ fontSize: '0.7rem', color: '#f43f5e' }}>{fieldError}</span>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => canEdit && startEditFin(act)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: canEdit ? 'pointer' : 'default' }}
                    title={canEdit ? 'Click para editar la fecha fin' : undefined}
                  >
                    <Calendar size={14} color="#f43f5e" />
                    <span style={canEdit ? { borderBottom: '1px dashed var(--border-glass)' } : undefined}>
                      {act.fin_actividad}
                    </span>
                  </div>
                )}
              </td>

              {/* Avance Programado (calculado a la fecha actual; editable inline vía fechas) */}
              <td style={{ padding: '1rem' }}>
                {editing?.id === act.id && editing.field === 'avance' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <input
                        type="date"
                        autoFocus
                        value={draftInicio}
                        onChange={(e) => setDraftInicio(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, act)}
                        style={dateInputStyle}
                        title="Fecha inicio"
                      />
                      <ArrowRight size={12} color="var(--text-muted)" />
                      <input
                        type="date"
                        value={draftFin}
                        onChange={(e) => setDraftFin(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, act)}
                        style={dateInputStyle}
                        title="Fecha fin"
                      />
                      <button onClick={() => saveEdit(act)} style={iconBtnStyle('#10b981')} title="Guardar">
                        <Check size={16} />
                      </button>
                      <button onClick={cancelEdit} style={iconBtnStyle('#f43f5e')} title="Cancelar">
                        <X size={16} />
                      </button>
                    </div>
                    {fieldError && (
                      <span style={{ fontSize: '0.7rem', color: '#f43f5e' }}>{fieldError}</span>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => canEdit && startEditAvance(act)}
                    style={{ cursor: canEdit ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    title={canEdit ? 'Click para editar fechas inicio/fin (recalcula el avance programado)' : undefined}
                  >
                    {barraAvance(avanceProgramadoActividad(act, new Date().toISOString().split('T')[0]), '#6366f1')}
                    {canEdit && <Pencil size={11} color="var(--text-subtle)" />}
                  </div>
                )}
              </td>

              {/* Avance Real (editable inline) */}
              <td style={{ padding: '1rem' }}>
                {editing?.id === act.id && editing.field === 'avanceReal' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <input
                        type="number"
                        autoFocus
                        min={0}
                        max={100}
                        step={1}
                        value={draftAvanceReal}
                        onChange={(e) => setDraftAvanceReal(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, act)}
                        style={{ ...dateInputStyle, width: '70px' }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>%</span>
                      <button onClick={() => saveEdit(act)} style={iconBtnStyle('#10b981')} title="Guardar">
                        <Check size={16} />
                      </button>
                      <button onClick={cancelEdit} style={iconBtnStyle('#f43f5e')} title="Cancelar">
                        <X size={16} />
                      </button>
                    </div>
                    {fieldError && (
                      <span style={{ fontSize: '0.7rem', color: '#f43f5e' }}>{fieldError}</span>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => canEdit && startEditAvanceReal(act)}
                    style={{ cursor: canEdit ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    title={canEdit ? 'Click para editar el avance real' : undefined}
                  >
                    {barraAvance(Number(act.avance_real) || 0, '#10b981')}
                    {canEdit && <Pencil size={11} color="var(--text-subtle)" />}
                  </div>
                )}
              </td>

              {/* Acciones */}
              {canEdit && (
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => onEditActivity(act)}
                      className="btn-secondary"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                      title="Editar actividad"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => onDeleteActivity(act.id_actividad)}
                      className="btn-danger"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                      title="Eliminar actividad"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
