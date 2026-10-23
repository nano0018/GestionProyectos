import React, { useState } from 'react';
import { X, Users, UserPlus, Trash2, ShieldCheck, Key, AlertCircle } from 'lucide-react';

export default function AccessManagerModal({ isOpen, onClose, project, onSaveAccess }) {
  const [newUuid, setNewUuid] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !project) return null;

  const currentAuthorized = project.uuids_usuarios_autorizados || [];

  const handleAddUuid = (e) => {
    e.preventDefault();
    setError('');
    const trimmed = newUuid.trim();

    if (!trimmed) {
      setError('Por favor ingrese un UUID de usuario válido.');
      return;
    }

    if (trimmed === project.uuid_usuario_dueno) {
      setError('El usuario creador ya tiene acceso completo por defecto.');
      return;
    }

    if (currentAuthorized.includes(trimmed)) {
      setError('Este usuario ya está en la lista de autorizados.');
      return;
    }

    const updated = [...currentAuthorized, trimmed];
    onSaveAccess(project.uuid_proyecto, updated);
    setNewUuid('');
  };

  const handleRemoveUuid = (uuidToRemove) => {
    const updated = currentAuthorized.filter(id => id !== uuidToRemove);
    onSaveAccess(project.uuid_proyecto, updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        
        {/* Encabezado */}
        <div className="modal-encabezado">
          <div className="grupo-titulo">
            <Users size={20} color="#6366f1" />
            <div>
              <h3 className="modal-titulo-chico">Gestionar Accesos al Proyecto</h3>
              <span className="subtitulo-modal">{project.nombre_proyecto}</span>
            </div>
          </div>
          <button onClick={onClose} className="modal-cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="modal-cuerpo-simple">

          {/* Propietario del proyecto (tiene acceso completo siempre) */}
          <div className="tarjeta-propietario">
            <ShieldCheck size={22} color="#10b981" />
            <div>
              <div className="tarjeta-propietario-etiqueta">Usuario Dueño (Propietario):</div>
              <code>{project.uuid_usuario_dueno}</code>
            </div>
          </div>

          {/* Agregar el UUID de un usuario autorizado */}
          <form onSubmit={handleAddUuid} className="formulario-autorizar">
            <label className="input-label">Agregar UUID de Usuario Autorizado</label>

            {error && (
              <div className="alerta-error chica">
                {error}
              </div>
            )}

            <div className="formulario-autorizar-fila">
              <input 
                type="text" 
                value={newUuid}
                onChange={(e) => setNewUuid(e.target.value)}
                placeholder="Ej. a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
                className="input-field"
              />
              <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                <UserPlus size={16} />
                <span>Autorizar</span>
              </button>
            </div>
          </form>

          {/* Lista de usuarios autorizados */}
          <div>
            <div className="input-label" style={{ marginBottom: '0.75rem' }}>
              Usuarios Autorizados Activos ({currentAuthorized.length})
            </div>

            {currentAuthorized.length === 0 ? (
              <div className="lista-vacia">
                No hay usuarios adicionales autorizados en este proyecto.
              </div>
            ) : (
              <div className="lista-autorizados">
                {currentAuthorized.map((uuid) => (
                  <div key={uuid} className="autorizado-fila">
                    <div className="autorizado-datos">
                      <Key size={14} color="#a5b4fc" />
                      <code>{uuid}</code>
                    </div>
                    <button 
                      onClick={() => handleRemoveUuid(uuid)}
                      className="btn-danger boton-revocar"
                      title="Revocar acceso"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Pie */}
        <div className="modal-pie">
          <button onClick={onClose} className="btn-primary">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
