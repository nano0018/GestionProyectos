import React from 'react';
import { Layers, ShieldCheck, Users, Calendar, ArrowRight, Settings, Trash2, Edit3 } from 'lucide-react';

export default function ProjectCard({ 
  project, 
  currentUser, 
  onSelectProject, 
  onEditProject, 
  onManageAccess, 
  onDeleteProject 
}) {
  const isOwner = currentUser?.id === project.uuid_usuario_dueno;
  const isAuthorized = project.uuids_usuarios_autorizados?.includes(currentUser?.id);

  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
      
      <div>
        {/* Header Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-indigo">
              <Layers size={12} />
              {project.componentes} {project.componentes === 1 ? 'Componente' : 'Componentes'}
            </span>
            
            {isOwner ? (
              <span className="badge badge-emerald">
                <ShieldCheck size={12} /> Creador / Dueño
              </span>
            ) : isAuthorized ? (
              <span className="badge badge-amber">
                <Users size={12} /> Usuario Autorizado
              </span>
            ) : (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                Lectura / Acceso
              </span>
            )}
          </div>

          {/* Settings / Owner Menu */}
          {isOwner && (
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button 
                onClick={() => onManageAccess(project)}
                className="btn-secondary"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                title="Gestionar Usuarios Autorizados (UUIDs)"
              >
                <Users size={13} />
              </button>
              <button 
                onClick={() => onEditProject(project)}
                className="btn-secondary"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                title="Editar Proyecto"
              >
                <Edit3 size={13} />
              </button>
              <button 
                onClick={() => onDeleteProject(project.uuid_proyecto)}
                className="btn-danger"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                title="Eliminar Proyecto"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Title and Description */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
          {project.nombre_proyecto}
        </h3>
        
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {project.descripcion_proyecto || 'Sin descripción asignada.'}
        </p>
      </div>

      {/* Footer Info & Select CTA */}
      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          <Users size={13} />
          <span>{project.uuids_usuarios_autorizados?.length || 0} Colaboradores</span>
        </div>

        <button 
          onClick={() => onSelectProject(project)}
          className="btn-primary"
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
        >
          <span>Ver Actividades</span>
          <ArrowRight size={14} />
        </button>
      </div>

    </div>
  );
}
