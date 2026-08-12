import React, { useState, useEffect } from 'react';
import { X, Layers, PlusCircle, CheckCircle } from 'lucide-react';

export default function ProjectFormModal({ isOpen, onClose, onSave, projectToEdit, currentUser }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [componentes, setComponentes] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (projectToEdit) {
      setNombre(projectToEdit.nombre_proyecto || '');
      setDescripcion(projectToEdit.descripcion_proyecto || '');
      setComponentes(projectToEdit.componentes || 1);
    } else {
      setNombre('');
      setDescripcion('');
      setComponentes(1);
    }
    setError('');
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    let compVal = parseInt(componentes, 10);
    if (isNaN(compVal) || compVal < 1) {
      compVal = 1; // Default to 1 if empty or invalid
    }

    if (compVal > 10) {
      setError('El número de componentes no puede exceder 10.');
      return;
    }

    if (!nombre.trim()) {
      setError('El nombre del proyecto es obligatorio.');
      return;
    }

    onSave({
      uuid_proyecto: projectToEdit ? projectToEdit.uuid_proyecto : undefined,
      nombre_proyecto: nombre.trim(),
      descripcion_proyecto: descripcion.trim(),
      componentes: compVal,
      uuid_usuario_dueno: projectToEdit ? projectToEdit.uuid_usuario_dueno : currentUser.id,
      uuids_usuarios_autorizados: projectToEdit ? projectToEdit.uuids_usuarios_autorizados : []
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={20} color="#6366f1" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              {projectToEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {error && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          <div>
            <label className="input-label">Nombre del Proyecto *</label>
            <input 
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Sistema de Logística Inteligente"
              className="input-field"
            />
          </div>

          <div>
            <label className="input-label">Descripción</label>
            <textarea 
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describa el alcance, entregables y objetivo principal del proyecto..."
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <label className="input-label">
              Número de Componentes (Máximo 10, por defecto 1)
            </label>
            <input 
              type="number"
              min={1}
              max={10}
              value={componentes}
              onChange={(e) => setComponentes(e.target.value)}
              placeholder="1"
              className="input-field"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.3rem', display: 'block' }}>
              Si se deja en blanco, se asigna automáticamente 1 (máximo permitido 10).
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <CheckCircle size={16} />
              <span>{projectToEdit ? 'Guardar Cambios' : 'Crear Proyecto'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
