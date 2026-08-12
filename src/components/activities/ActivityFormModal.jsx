import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, ListChecks, Link, ArrowRightLeft } from 'lucide-react';

export default function ActivityFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  activityToEdit, 
  existingActivities, 
  currentProjectId, 
  currentUser 
}) {
  const [nombre, setNombre] = useState('');
  const [idActividad, setIdActividad] = useState(1);
  const [predecesoras, setPredecesoras] = useState([]);
  const [dependientes, setDependientes] = useState([]);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    if (activityToEdit) {
      setNombre(activityToEdit.nombre_actividad || '');
      setIdActividad(activityToEdit.id_actividad || 1);
      setPredecesoras(activityToEdit.actividades_predecesoras || []);
      setDependientes(activityToEdit.actividades_dependientes || []);
      setInicio(activityToEdit.inicio_actividad || todayStr);
      setFin(activityToEdit.fin_actividad || todayStr);
    } else {
      setNombre('');
      // Calculate next id_actividad (max + 1) up to 100
      const maxId = existingActivities.reduce((max, act) => Math.max(max, act.id_actividad || 0), 0);
      const nextId = Math.min(maxId + 1, 100);
      setIdActividad(nextId);
      setPredecesoras([]);
      setDependientes([]);
      setInicio(todayStr);
      setFin(todayStr);
    }
    setError('');
  }, [activityToEdit, isOpen, existingActivities]);

  if (!isOpen) return null;

  const handleTogglePredecesora = (idVal) => {
    if (predecesoras.includes(idVal)) {
      setPredecesoras(predecesoras.filter(item => item !== idVal));
    } else {
      setPredecesoras([...predecesoras, idVal]);
    }
  };

  const handleToggleDependiente = (idVal) => {
    if (dependientes.includes(idVal)) {
      setDependientes(dependientes.filter(item => item !== idVal));
    } else {
      setDependientes([...dependientes, idVal]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre de la actividad es obligatorio.');
      return;
    }

    if (!inicio || !fin) {
      setError('Debe seleccionar las fechas de inicio y fin.');
      return;
    }

    if (fin < inicio) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    const numId = parseInt(idActividad, 10);
    if (numId < 1 || numId > 100) {
      setError('El id_actividad debe ser un número entero entre 1 y 100.');
      return;
    }

    onSave({
      id: activityToEdit ? activityToEdit.id : undefined,
      id_actividad: numId,
      uuid_proyecto: currentProjectId,
      nombre_actividad: nombre.trim(),
      actividades_predecesoras: predecesoras,
      actividades_dependientes: dependientes,
      inicio_actividad: inicio,
      fin_actividad: fin,
      uuid_usuario_dueno: activityToEdit ? activityToEdit.uuid_usuario_dueno : currentUser.id,
      uuids_usuarios_autorizados: activityToEdit ? activityToEdit.uuids_usuarios_autorizados : []
    });

    onClose();
  };

  // Filter out current activity from options to prevent self-dependency
  const otherActivities = existingActivities.filter(
    act => !activityToEdit || act.id_actividad !== activityToEdit.id_actividad
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ListChecks size={20} color="#6366f1" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              {activityToEdit ? `Editar Actividad #${activityToEdit.id_actividad}` : `Nueva Actividad (#${idActividad})`}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {error && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '1rem' }}>
            <div>
              <label className="input-label">Nombre de la Actividad *</label>
              <input 
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Diseño del Esquema de Datos"
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label">ID Actividad (1-100)</label>
              <input 
                type="number"
                min={1}
                max={100}
                value={idActividad}
                onChange={(e) => setIdActividad(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Fechas Simples YYYY-MM-DD */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Fecha Inicio (sin hora)</label>
              <input 
                type="date"
                required
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label">Fecha Fin (sin hora)</label>
              <input 
                type="date"
                required
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Selector de Actividades Predecesoras */}
          <div>
            <label className="input-label">Actividades Predecesoras</label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.5rem' }}>
              Seleccione las actividades que deben finalizar antes de iniciar esta.
            </p>

            {otherActivities.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px border-dashed var(--border-glass)' }}>
                No hay otras actividades registradas aún en este proyecto.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                {otherActivities.map(act => (
                  <label key={act.id_actividad} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', padding: '0.25rem' }}>
                    <input 
                      type="checkbox"
                      checked={predecesoras.includes(act.id_actividad)}
                      onChange={() => handleTogglePredecesora(act.id_actividad)}
                    />
                    <span>#{act.id_actividad} - {act.nombre_actividad}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selector de Actividades Dependientes */}
          <div>
            <label className="input-label">Actividades Dependientes</label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.5rem' }}>
              Seleccione las actividades que dependen del término de esta.
            </p>

            {otherActivities.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px border-dashed var(--border-glass)' }}>
                No hay otras actividades para vincular.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                {otherActivities.map(act => (
                  <label key={act.id_actividad} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', padding: '0.25rem' }}>
                    <input 
                      type="checkbox"
                      checked={dependientes.includes(act.id_actividad)}
                      onChange={() => handleToggleDependiente(act.id_actividad)}
                    />
                    <span>#{act.id_actividad} - {act.nombre_actividad}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <CheckCircle size={16} />
              <span>{activityToEdit ? 'Guardar Cambios' : 'Crear Actividad'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
