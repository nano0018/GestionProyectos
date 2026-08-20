import React, { useState, useEffect } from 'react';
import Navbar from './ui/Navbar';
import SqlSetupModal from './ui/SqlSetupModal';
import AuthModal from './auth/AuthModal';
import ProjectCard from './projects/ProjectCard';
import ProjectFormModal from './projects/ProjectFormModal';
import AccessManagerModal from './projects/AccessManagerModal';
import ActivityFormModal from './activities/ActivityFormModal';
import ActivityExcelModal from './activities/ActivityExcelModal';
import ActivityList from './activities/ActivityList';
import GanttChart from './activities/GanttChart';
import CurvaS from './activities/CurvaS';

import { 
  supabase, 
  isSupabaseConfigured, 
  getInitialDemoUser, 
  getDemoProjects, 
  getDemoActivities,
  saveDemoProjects,
  saveDemoActivities,
  markSessionStart,
  isSessionExpired,
  clearSessionStart
} from '../lib/supabase';

import { 
  LayoutGrid, 
  FolderPlus, 
  Plus, 
  ListChecks,
  BarChart2,
  TrendingUp,
  Search,
  ArrowLeft, 
  Shield, 
  Users,
  Sparkles,
  Info,
  FileSpreadsheet
} from 'lucide-react';

export default function ProjectDashboard() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'gantt'
  
  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [projectForAccess, setProjectForAccess] = useState(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // 1. Initial Auth & Data Load
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Check if session has expired
      if (isSessionExpired()) {
        supabase.auth.signOut();
        clearSessionStart();
        return;
      }

      // Supabase auth listener
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });
          markSessionStart();
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });
          markSessionStart();
        } else {
          setUser(null);
          clearSessionStart();
        }
      });

      // Periodic session expiry check (every 5 minutes)
      const expiryCheck = setInterval(() => {
        if (isSessionExpired()) {
          supabase.auth.signOut();
          clearSessionStart();
        }
      }, 5 * 60 * 1000);

      return () => {
        subscription.unsubscribe();
        clearInterval(expiryCheck);
      };
    } else {
      // Demo Mode initial user
      const initialUser = getInitialDemoUser();
      setUser(initialUser);
    }
  }, []);

  // 2. Load Projects
  const fetchProjects = async () => {
    if (!user) {
      setProjects([]);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar proyectos desde Supabase:', error);
      } else if (data) {
        setProjects(data);
      }
    } else {
      setProjects(getDemoProjects());
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  // 3. Load Activities when a project is selected
  const fetchActivities = async (projectId) => {
    if (!projectId || !user) {
      setActivities([]);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('actividades')
        .select('*')
        .eq('uuid_proyecto', projectId)
        .order('id_actividad', { ascending: true });

      if (!error && data) {
        setActivities(data);
      }
    } else {
      const allDemo = getDemoActivities();
      const filtered = allDemo.filter(a => a.uuid_proyecto === projectId);
      setActivities(filtered);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchActivities(selectedProject.uuid_proyecto);
    }
  }, [selectedProject]);

  // --- Handlers: Projects ---
  const handleSaveProject = async (projectData) => {
    if (!user) {
      alert('Debes iniciar sesión para crear o editar un proyecto.');
      setIsAuthOpen(true);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        if (projectData.uuid_proyecto) {
          // Update
          const { data, error } = await supabase
            .from('proyectos')
            .update({
              nombre_proyecto: projectData.nombre_proyecto,
              descripcion_proyecto: projectData.descripcion_proyecto,
              componentes: projectData.componentes
            })
            .eq('uuid_proyecto', projectData.uuid_proyecto)
            .select();

          if (error) {
            console.error('Error al actualizar proyecto en Supabase:', error);
            alert(`Error de Supabase (${error.code || 'RLS'}): ${error.message}`);
          } else {
            fetchProjects();
          }
        } else {
          // Insert - Limpiamos payload para omitir uuid_proyecto si viene undefined/null
          const payload = {
            nombre_proyecto: projectData.nombre_proyecto,
            descripcion_proyecto: projectData.descripcion_proyecto,
            componentes: projectData.componentes,
            uuid_usuario_dueno: user.id,
            uuids_usuarios_autorizados: projectData.uuids_usuarios_autorizados || []
          };

          const { data, error } = await supabase
            .from('proyectos')
            .insert([payload])
            .select();

          if (error) {
            console.error('Error al insertar proyecto en Supabase:', error);
            alert(`Error al crear proyecto en Supabase:\nCódigo: ${error.code || 'RLS'}\nMensaje: ${error.message}`);
          } else {
            fetchProjects();
          }
        }
      } catch (err) {
        console.error('Excepción atrapada al guardar proyecto:', err);
        alert(`Error inesperado: ${err.message}`);
      }
    } else {
      // Demo Mode
      const currentProjs = getDemoProjects();
      if (projectData.uuid_proyecto) {
        const updated = currentProjs.map(p => p.uuid_proyecto === projectData.uuid_proyecto ? { ...p, ...projectData } : p);
        saveDemoProjects(updated);
        setProjects(updated);
      } else {
        const newProj = {
          ...projectData,
          uuid_proyecto: 'p-' + Math.random().toString(36).substring(2, 8),
          created_at: new Date().toISOString()
        };
        const updated = [newProj, ...currentProjs];
        saveDemoProjects(updated);
        setProjects(updated);
      }
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('¿Está seguro de eliminar este proyecto y sus actividades?')) return;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('proyectos').delete().eq('uuid_proyecto', projectId);
      if (error) {
        console.error('Error al eliminar proyecto en Supabase:', error);
        alert(`Error al eliminar en Supabase: ${error.message}`);
      } else {
        fetchProjects();
      }
    } else {
      const currentProjs = getDemoProjects().filter(p => p.uuid_proyecto !== projectId);
      saveDemoProjects(currentProjs);
      setProjects(currentProjs);
    }

    if (selectedProject?.uuid_proyecto === projectId) {
      setSelectedProject(null);
    }
  };

  const handleSaveAccess = async (projectId, newAuthorizedUuids) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('proyectos')
        .update({ uuids_usuarios_autorizados: newAuthorizedUuids })
        .eq('uuid_proyecto', projectId);

      if (error) {
        console.error('Error al guardar autorizaciones en Supabase:', error);
        alert(`Error de autorización en Supabase: ${error.message}`);
      } else {
        fetchProjects();
      }
    } else {
      const currentProjs = getDemoProjects().map(p => 
        p.uuid_proyecto === projectId ? { ...p, uuids_usuarios_autorizados: newAuthorizedUuids } : p
      );
      saveDemoProjects(currentProjs);
      setProjects(currentProjs);
    }

    if (selectedProject?.uuid_proyecto === projectId) {
      setSelectedProject(prev => prev ? { ...prev, uuids_usuarios_autorizados: newAuthorizedUuids } : null);
    }
  };

  // --- Handlers: Activities ---
  const handleSaveActivity = async (actData) => {
    if (isSupabaseConfigured && supabase) {
      try {
        if (actData.id) {
          // Update by row id
          const { data, error } = await supabase
            .from('actividades')
            .update({
              id_actividad: actData.id_actividad,
              nombre_actividad: actData.nombre_actividad,
              actividades_predecesoras: actData.actividades_predecesoras,
              actividades_dependientes: actData.actividades_dependientes,
              inicio_actividad: actData.inicio_actividad,
              fin_actividad: actData.fin_actividad,
              avance_real: actData.avance_real
            })
            .eq('id', actData.id)
            .select();

          if (error) {
            console.error('Error al actualizar actividad:', error);
            alert(`Error al actualizar actividad: ${error.message}`);
          } else {
            fetchActivities(selectedProject.uuid_proyecto);
          }
        } else {
          // Insert
          const payload = {
            uuid_proyecto: actData.uuid_proyecto,
            nombre_actividad: actData.nombre_actividad,
            id_actividad: actData.id_actividad,
            actividades_predecesoras: actData.actividades_predecesoras || [],
            actividades_dependientes: actData.actividades_dependientes || [],
            inicio_actividad: actData.inicio_actividad,
            fin_actividad: actData.fin_actividad,
            avance_real: actData.avance_real ?? 0,
            uuid_usuario_dueno: user.id,
            uuids_usuarios_autorizados: actData.uuids_usuarios_autorizados || []
          };

          const { data, error } = await supabase
            .from('actividades')
            .insert([payload])
            .select();

          if (error) {
            console.error('Error al insertar actividad en Supabase:', error);
            alert(`Error al insertar actividad en Supabase:\nCódigo: ${error.code}\nMensaje: ${error.message}`);
          } else {
            fetchActivities(selectedProject.uuid_proyecto);
          }
        }
      } catch (err) {
        console.error('Excepción al guardar actividad:', err);
        alert(`Error inesperado al guardar actividad: ${err.message}`);
      }
    } else {
      // Demo Mode
      const allDemoActs = getDemoActivities();
      if (actData.id) {
        const updated = allDemoActs.map(a => a.id === actData.id ? { ...a, ...actData } : a);
        saveDemoActivities(updated);
        setActivities(updated.filter(a => a.uuid_proyecto === selectedProject.uuid_proyecto));
      } else {
        const newAct = {
          ...actData,
          id: 'act-' + Math.random().toString(36).substring(2, 7)
        };
        const updated = [...allDemoActs, newAct];
        saveDemoActivities(updated);
        setActivities(updated.filter(a => a.uuid_proyecto === selectedProject.uuid_proyecto));
      }
    }
  };

  const handleDeleteActivity = async (idActividad) => {
    if (!window.confirm(`¿Eliminar la Actividad #${idActividad}?`)) return;

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('actividades')
        .delete()
        .eq('uuid_proyecto', selectedProject.uuid_proyecto)
        .eq('id_actividad', idActividad);

      fetchActivities(selectedProject.uuid_proyecto);
    } else {
      const allDemoActs = getDemoActivities();
      const updated = allDemoActs.filter(
        a => !(a.uuid_proyecto === selectedProject.uuid_proyecto && a.id_actividad === idActividad)
      );
      saveDemoActivities(updated);
      setActivities(updated.filter(a => a.uuid_proyecto === selectedProject.uuid_proyecto));
    }
  };

  const handleBatchImportActivities = async (newActivitiesList) => {
    if (!selectedProject) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('actividades')
          .insert(newActivitiesList)
          .select();

        if (error) {
          console.error('Error en importación masiva:', error);
          alert(`Error al importar actividades a Supabase:\nCódigo: ${error.code}\nMensaje: ${error.message}`);
        } else {
          alert(`¡${newActivitiesList.length} actividades importadas exitosamente!`);
          fetchActivities(selectedProject.uuid_proyecto);
        }
      } catch (err) {
        console.error('Excepción en importación masiva:', err);
        alert(`Error al procesar la importación: ${err.message}`);
      }
    } else {
      // Demo mode
      const allDemoActs = getDemoActivities();
      const preparedDemo = newActivitiesList.map(a => ({
        ...a,
        id: 'act-' + Math.random().toString(36).substring(2, 8)
      }));
      const updated = [...allDemoActs, ...preparedDemo];
      saveDemoActivities(updated);
      setActivities(updated.filter(a => a.uuid_proyecto === selectedProject.uuid_proyecto));
      alert(`¡${newActivitiesList.length} actividades importadas en modo demostración!`);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    clearSessionStart();
    setUser(null);
    setProjects([]);
    setActivities([]);
    setSelectedProject(null);
  };

  // Filtered projects
  const filteredProjects = projects.filter(p => 
    p.nombre_proyecto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.descripcion_proyecto && p.descripcion_proyecto.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isCurrentProjectOwner = selectedProject && user && selectedProject.uuid_usuario_dueno === user.id;
  const isCurrentProjectAuthorized = selectedProject && user && (selectedProject.uuids_usuarios_autorizados || []).includes(user.id);
  const canEditSelectedProject = isCurrentProjectOwner || isCurrentProjectAuthorized;

  // Calculate project duration from activities
  const getProjectDuration = () => {
    if (!activities || activities.length === 0) return null;

    const starts = activities.map(a => new Date(a.inicio_actividad).getTime()).filter(t => !isNaN(t));
    const ends = activities.map(a => new Date(a.fin_actividad).getTime()).filter(t => !isNaN(t));
    if (starts.length === 0 || ends.length === 0) return null;

    const minStart = Math.min(...starts);
    const maxEnd = Math.max(...ends);

    const totalDays = Math.round((maxEnd - minStart) / (1000 * 60 * 60 * 24)) + 1;

    // Business days: exclude Saturdays (6) and Sundays (0)
    let businessDays = 0;
    const current = new Date(minStart);
    const end = new Date(maxEnd);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        businessDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return { totalDays, businessDays };
  };

  const projectDuration = getProjectDuration();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <Navbar 
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        isSupabaseConnected={isSupabaseConfigured}
        onNewProject={() => {
          setProjectToEdit(null);
          setIsProjectModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Banner if Supabase is not configured yet */}
        {!isSupabaseConfigured && user && (
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Info size={22} color="#f59e0b" />
              <div>
                <strong style={{ color: 'var(--accent-amber)', fontSize: '0.9rem' }}>Modo Demostración / Preview Activo</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Estás interactuando con datos de prueba locales. Para conectar con tu base de datos de Supabase y probar autenticación real, abre el instalador SQL.
                </p>
              </div>
            </div>
            <button onClick={() => setIsSqlModalOpen(true)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}>
              Ver Script SQL
            </button>
          </div>
        )}

        {/* BREADCRUMB / NAVIGATION BAR */}
        {selectedProject ? (
          <div style={{ marginBottom: '2rem' }}>
            <button 
              onClick={() => setSelectedProject(null)}
              className="btn-secondary"
              style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}
            >
              <ArrowLeft size={16} />
              <span>Volver a la lista de proyectos</span>
            </button>

            <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                  <span className="badge badge-indigo">
                    {selectedProject.componentes} Componente(s)
                  </span>
                  {isCurrentProjectOwner && (
                    <span className="badge badge-emerald"><Shield size={12} /> Creador / Dueño</span>
                  )}
                  {isCurrentProjectAuthorized && (
                    <span className="badge badge-amber"><Users size={12} /> Autorizado</span>
                  )}
                </div>

                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }} className="gradient-text">
                  {selectedProject.nombre_proyecto}
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {selectedProject.descripcion_proyecto || 'Sin descripción.'}
                </p>
                {projectDuration && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', marginTop: '0.35rem', fontWeight: 600 }}>
                    Duración proyecto: {projectDuration.totalDays} días [{projectDuration.businessDays} días hábiles]
                  </p>
                )}
              </div>

              {/* Activity Actions & Toggle View Mode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                
                {/* View Mode Toggle */}
                <div style={{ display: 'flex', background: 'var(--bg-glass)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <button 
                    onClick={() => setViewMode('list')}
                    style={{
                      background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                      color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <ListChecks size={15} /> Tabla
                  </button>

                  <button 
                    onClick={() => setViewMode('gantt')}
                    style={{
                      background: viewMode === 'gantt' ? 'var(--primary)' : 'transparent',
                      color: viewMode === 'gantt' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <BarChart2 size={15} /> Diagrama Gantt
                  </button>

                  <button
                    onClick={() => setViewMode('curvas')}
                    style={{
                      background: viewMode === 'curvas' ? 'var(--primary)' : 'transparent',
                      color: viewMode === 'curvas' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <TrendingUp size={15} /> Curva S
                  </button>
                </div>

                {canEditSelectedProject && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setIsExcelModalOpen(true)}
                      className="btn-secondary"
                      style={{ fontSize: '0.85rem', borderColor: 'rgba(16, 185, 129, 0.4)', color: 'var(--accent-emerald)' }}
                      title="Importar actividades masivamente desde un archivo Excel (.xlsx)"
                    >
                      <FileSpreadsheet size={16} />
                      <span>Importar Excel</span>
                    </button>

                    <button 
                      onClick={() => {
                        setActivityToEdit(null);
                        setIsActivityModalOpen(true);
                      }}
                      className="btn-primary"
                      style={{ fontSize: '0.85rem' }}
                    >
                      <Plus size={16} />
                      <span>Nueva Actividad</span>
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        ) : (
          /* PROJECTS DASHBOARD HEADER */
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }} className="gradient-text">
                Proyectos Registrados
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Gestiona tus proyectos y asigna autorizaciones a otros colaboradores por su UUID de Supabase.
              </p>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar proyecto por nombre..."
                className="input-field"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>
        )}

        {/* MAIN BODY CONTENT */}
        {selectedProject ? (
          <div>
            {/* Gantt Chart View */}
            {viewMode === 'gantt' && (
              <GanttChart activities={activities} />
            )}

            {/* Curva S View */}
            {viewMode === 'curvas' && (
              <CurvaS activities={activities} />
            )}

            {/* Activities Table View */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Lista de Actividades ({activities.length} / Máximo 100)
                </h3>
              </div>

              <ActivityList 
                activities={activities}
                onEditActivity={(act) => {
                  setActivityToEdit(act);
                  setIsActivityModalOpen(true);
                }}
                onDeleteActivity={handleDeleteActivity}
                onQuickUpdateActivity={handleSaveActivity}
                currentUser={user}
                canEdit={canEditSelectedProject}
              />
            </div>
          </div>
        ) : (
          /* PROJECTS GRID */
          filteredProjects.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <FolderPlus size={48} color="var(--text-subtle)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-muted)' }}>No se encontraron proyectos</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-subtle)', maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
                Crea tu primer proyecto para definir componentes, registrar actividades y dar acceso a otros usuarios.
              </p>
              <button 
                onClick={() => {
                  setProjectToEdit(null);
                  setIsProjectModalOpen(true);
                }}
                className="btn-primary"
              >
                <Plus size={16} />
                <span>Crear Primer Proyecto</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {filteredProjects.map(proj => (
                <ProjectCard 
                  key={proj.uuid_proyecto}
                  project={proj}
                  currentUser={user}
                  onSelectProject={(p) => setSelectedProject(p)}
                  onEditProject={(p) => {
                    setProjectToEdit(p);
                    setIsProjectModalOpen(true);
                  }}
                  onManageAccess={(p) => {
                    setProjectForAccess(p);
                    setIsAccessModalOpen(true);
                  }}
                  onDeleteProject={handleDeleteProject}
                />
              ))}
            </div>
          )
        )}

      </main>

      {/* ALL SYSTEM MODALS */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
        currentUser={user}
      />

      <SqlSetupModal 
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        isConfigured={isSupabaseConfigured}
      />

      <ProjectFormModal 
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        projectToEdit={projectToEdit}
        currentUser={user}
      />

      <AccessManagerModal 
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        project={projectForAccess}
        onSaveAccess={handleSaveAccess}
      />

      <ActivityFormModal 
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={handleSaveActivity}
        activityToEdit={activityToEdit}
        existingActivities={activities}
        currentProjectId={selectedProject?.uuid_proyecto}
        currentUser={user}
      />

      <ActivityExcelModal 
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportActivities={handleBatchImportActivities}
        existingActivities={activities}
        currentProjectId={selectedProject?.uuid_proyecto}
        currentUser={user}
      />

    </div>
  );
}
