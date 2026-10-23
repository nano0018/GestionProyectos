import React, { useState } from 'react';
import { Calendar, ArrowRight, Edit3, Trash2, ListFilter, Check, X, Pencil } from 'lucide-react';
import { avanceProgramadoActividad } from '../../lib/curvaS';
import AvanceRealModal from './AvanceRealModal';

// Barra de progreso con porcentaje: `valor` en 0-100 y `color` del relleno
const barraAvance = (valor, color) => (
  <div className="barra-avance">
    <div className="barra-avance-pista">
      <div className="barra-avance-relleno" style={{ width: `${valor}%`, background: color }} />
    </div>
    <span className="barra-avance-valor" style={{ color }}>
      {valor.toFixed(0)}%
    </span>
  </div>
);

// Convierte [1, 2] en "[1;2]" (o "-" si no hay ninguna)
const formatList = (arr) => {
  if (!arr || arr.length === 0) return '-';
  return `[${arr.join(';')}]`;
};

export default function ActivityList({
  activities,
  onEditActivity,
  onDeleteActivity,
  onQuickUpdateActivity,
  currentUser,
  canEdit
}) {
  // Edición inline: { id, field: 'avance' | 'fin' } de la celda activa (una a la vez)
  const [editing, setEditing] = useState(null);
  const [draftInicio, setDraftInicio] = useState('');
  const [draftFin, setDraftFin] = useState('');
  const [avanceRealActivity, setAvanceRealActivity] = useState(null); // actividad cuyo historial se edita en el modal
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

  const cancelEdit = () => {
    setEditing(null);
    setFieldError('');
  };

  // Valida las fechas del borrador y las guarda en la actividad
  const saveEdit = (act) => {
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

  // Enter guarda y Escape cancela mientras se edita una fecha
  const handleEditKeyDown = (e, act) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(act);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  // Estado vacío
  if (activities.length === 0) {
    return (
      <div className="estado-vacio">
        <ListFilter size={40} color="var(--text-subtle)" style={{ marginBottom: '1rem' }} />
        <h4 className="estado-vacio-titulo">Aún no hay actividades en este proyecto</h4>
        <p className="estado-vacio-texto">
          Haz clic en "Nueva Actividad" para comenzar a planificar el cronograma.
        </p>
      </div>
    );
  }

  // Fecha de hoy (YYYY-MM-DD) para calcular el avance programado
  const hoy = new Date().toISOString().split('T')[0];

  // Editor inline de fechas: `campos` (inputs) + botones guardar/cancelar + mensaje de error
  const editorFechas = (act, campos) => (
    <div className="edicion-inline">
      <div className="edicion-inline-campos">
        {campos}
        <button onClick={() => saveEdit(act)} className="boton-icono color-ok" title="Guardar">
          <Check size={16} />
        </button>
        <button onClick={cancelEdit} className="boton-icono color-peligro" title="Cancelar">
          <X size={16} />
        </button>
      </div>
      {fieldError && <span className="edicion-inline-error">{fieldError}</span>}
    </div>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Modal del historial de avances reales */}
      <AvanceRealModal
        isOpen={!!avanceRealActivity}
        activity={avanceRealActivity}
        onClose={() => setAvanceRealActivity(null)}
        onSave={onQuickUpdateActivity}
      />

      <table className="tabla-actividades">
        {/* Encabezados de columna */}
        <thead>
          <tr>
            <th>ID</th>
            <th>Actividad</th>
            <th>Predecesoras</th>
            <th>Dependientes</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Avance Programado</th>
            <th>Avance Real</th>
            {canEdit && <th className="columna-acciones">Acciones</th>}
          </tr>
        </thead>

        {/* Una fila por actividad */}
        <tbody>
          {activities.map((act) => (
            <tr key={act.id_actividad} className="glass-card fila-actividad">
              {/* ID de la actividad */}
              <td className="celda-id">#{act.id_actividad}</td>

              {/* Nombre */}
              <td className="celda-nombre">{act.nombre_actividad}</td>

              {/* Predecesoras */}
              <td>
                <span className="badge badge-amber">{formatList(act.actividades_predecesoras)}</span>
              </td>

              {/* Dependientes */}
              <td>
                <span className="badge badge-indigo">{formatList(act.actividades_dependientes)}</span>
              </td>

              {/* Fecha de inicio (solo lectura; se edita desde Avance Programado) */}
              <td className="celda-fecha">
                <div className="fecha-con-icono">
                  <Calendar size={14} color="#6ee7b7" />
                  <span>{act.inicio_actividad}</span>
                </div>
              </td>

              {/* Fecha de fin (editable al hacer clic) */}
              <td className="celda-fecha">
                {editing?.id === act.id && editing.field === 'fin' ? (
                  editorFechas(
                    act,
                    <input
                      type="date"
                      autoFocus
                      value={draftFin}
                      onChange={(e) => setDraftFin(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, act)}
                      className="input-fecha-compacto"
                    />
                  )
                ) : (
                  <div
                    onClick={() => canEdit && startEditFin(act)}
                    className="fecha-con-icono"
                    style={{ cursor: canEdit ? 'pointer' : 'default' }}
                    title={canEdit ? 'Click para editar la fecha fin' : undefined}
                  >
                    <Calendar size={14} color="#f43f5e" />
                    <span className={canEdit ? 'valor-editable' : undefined}>{act.fin_actividad}</span>
                  </div>
                )}
              </td>

              {/* Avance programado a hoy (se edita cambiando las fechas de inicio y fin) */}
              <td>
                {editing?.id === act.id && editing.field === 'avance' ? (
                  editorFechas(
                    act,
                    <>
                      <input
                        type="date"
                        autoFocus
                        value={draftInicio}
                        onChange={(e) => setDraftInicio(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, act)}
                        className="input-fecha-compacto"
                        title="Fecha inicio"
                      />
                      <ArrowRight size={12} color="var(--text-muted)" />
                      <input
                        type="date"
                        value={draftFin}
                        onChange={(e) => setDraftFin(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, act)}
                        className="input-fecha-compacto"
                        title="Fecha fin"
                      />
                    </>
                  )
                ) : (
                  <div
                    onClick={() => canEdit && startEditAvance(act)}
                    className="avance-editable"
                    style={{ cursor: canEdit ? 'pointer' : 'default' }}
                    title={canEdit ? 'Click para editar fechas inicio/fin (recalcula el avance programado)' : undefined}
                  >
                    {barraAvance(avanceProgramadoActividad(act, hoy), '#6366f1')}
                    {canEdit && <Pencil size={11} color="var(--text-subtle)" />}
                  </div>
                )}
              </td>

              {/* Avance real (al hacer clic abre el modal del historial de avances) */}
              <td>
                <div
                  onClick={() => canEdit && setAvanceRealActivity(act)}
                  className="avance-editable"
                  style={{ cursor: canEdit ? 'pointer' : 'default' }}
                  title={canEdit ? 'Click para registrar avances reales por fecha' : undefined}
                >
                  {barraAvance(Number(act.avance_real) || 0, '#10b981')}
                  {canEdit && <Pencil size={11} color="var(--text-subtle)" />}
                </div>
              </td>

              {/* Acciones: editar y eliminar */}
              {canEdit && (
                <td className="columna-acciones">
                  <div className="acciones-fila">
                    <button
                      onClick={() => onEditActivity(act)}
                      className="btn-secondary boton-accion-fila"
                      title="Editar actividad"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteActivity(act.id_actividad)}
                      className="btn-danger boton-accion-fila"
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
