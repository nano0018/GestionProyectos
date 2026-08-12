import React from 'react';
import { Calendar, ArrowRight, Edit3, Trash2, Link, ListFilter } from 'lucide-react';

export default function ActivityList({ 
  activities, 
  onEditActivity, 
  onDeleteActivity, 
  currentUser, 
  canEdit 
}) {
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

              {/* Fecha Fin */}
              <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} color="#f43f5e" />
                  <span>{act.fin_actividad}</span>
                </div>
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
