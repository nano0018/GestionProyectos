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
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={20} color="#6366f1" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Gestionar Accesos al Proyecto</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{project.nombre_proyecto}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          
          {/* Owner Info */}
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={22} color="#10b981" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7' }}>Usuario Dueño (Propietario):</div>
              <code style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>{project.uuid_usuario_dueno}</code>
            </div>
          </div>

          {/* Add New Authorized User UUID */}
          <form onSubmit={handleAddUuid} style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">Agregar UUID de Usuario Autorizado</label>
            
            {error && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
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

          {/* List of Authorized Users */}
          <div>
            <div className="input-label" style={{ marginBottom: '0.75rem' }}>
              Usuarios Autorizados Activos ({currentAuthorized.length})
            </div>

            {currentAuthorized.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px border-dashed var(--border-glass)', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                No hay usuarios adicionales autorizados en este proyecto.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {currentAuthorized.map((uuid) => (
                  <div key={uuid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Key size={14} color="#a5b4fc" />
                      <code style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{uuid}</code>
                    </div>
                    <button 
                      onClick={() => handleRemoveUuid(uuid)}
                      className="btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
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

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-primary">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
