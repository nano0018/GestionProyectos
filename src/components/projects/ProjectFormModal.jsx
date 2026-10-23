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

  if (!currentUser) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-aviso" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
          <p>
            Debes iniciar sesión para crear o editar un proyecto.
          </p>
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

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
        
        {/* Encabezado */}
        <div className="modal-encabezado">
          <div className="grupo-titulo">
            <Layers size={20} color="#6366f1" />
            <h3 className="modal-titulo">
              {projectToEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}
            </h3>
          </div>
          <button onClick={onClose} className="modal-cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="modal-cuerpo">
          
          {error && (
            <div className="alerta-error">
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
            <span className="ayuda-campo">
              Si se deja en blanco, se asigna automáticamente 1 (máximo permitido 10).
            </span>
          </div>

          {/* Acciones */}
          <div className="modal-acciones separada">
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
