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
    <div className="glass-card tarjeta-proyecto">

      <div>
        {/* Insignias (componentes y rol del usuario) y menú del propietario */}
        <div className="tarjeta-proyecto-insignias">
          <div className="tarjeta-proyecto-etiquetas">
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
              <span className="badge badge-neutra">
                Lectura / Acceso
              </span>
            )}
          </div>

          {/* Acciones del propietario: accesos, editar y eliminar */}
          {isOwner && (
            <div className="tarjeta-proyecto-menu">
              <button 
                onClick={() => onManageAccess(project)}
                className="btn-secondary"
                title="Gestionar Usuarios Autorizados (UUIDs)"
              >
                <Users size={13} />
              </button>
              <button 
                onClick={() => onEditProject(project)}
                className="btn-secondary"
                title="Editar Proyecto"
              >
                <Edit3 size={13} />
              </button>
              <button 
                onClick={() => onDeleteProject(project.uuid_proyecto)}
                className="btn-danger"
                title="Eliminar Proyecto"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Título y descripción */}
        <h3 className="tarjeta-proyecto-titulo">
          {project.nombre_proyecto}
        </h3>
        
        <p className="tarjeta-proyecto-descripcion">
          {project.descripcion_proyecto || 'Sin descripción asignada.'}
        </p>
      </div>

      {/* Pie: colaboradores y botón para abrir el proyecto */}
      <div className="tarjeta-proyecto-pie">
        <div className="tarjeta-proyecto-colaboradores">
          <Users size={13} />
          <span>{project.uuids_usuarios_autorizados?.length || 0} Colaboradores</span>
        </div>

        <button 
          onClick={() => onSelectProject(project)}
          className="btn-primary"
        >
          <span>Ver Actividades</span>
          <ArrowRight size={14} />
        </button>
      </div>

    </div>
  );
}
