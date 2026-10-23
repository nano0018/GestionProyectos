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
import PlazoProyectoModal from './projects/PlazoProyectoModal';
import FestivosModal from './projects/FestivosModal';
import { contarHabiles, diasCalendario, setFestivos } from '../lib/diasHabiles';
import { sincronizarRelaciones, quitarActividad, reprogramarDependientes, violaciones, calcularTraslapes } from '../lib/dependencias';

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
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'gantt' | 'curvas'
  
  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isPlazoModalOpen, setIsPlazoModalOpen] = useState(false);
  const [isFestivosModalOpen, setIsFestivosModalOpen] = useState(false);
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
  // Crea o actualiza un proyecto (Supabase o modo demo)
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

  // Elimina un proyecto y, si estaba abierto, vuelve a la lista
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

  // Guarda la lista de usuarios autorizados de un proyecto
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

  // Campos editables de una actividad que se envían a Supabase en cada update.
  const camposActividad = (a) => ({
    id_actividad: a.id_actividad,
    nombre_actividad: a.nombre_actividad,
    actividades_predecesoras: a.actividades_predecesoras || [],
    actividades_dependientes: a.actividades_dependientes || [],
    inicio_actividad: a.inicio_actividad,
    fin_actividad: a.fin_actividad,
    avance_real: a.avance_real ?? 0,
    historial_avance: a.historial_avance ?? [],
    traslapes: a.traslapes ?? {}
  });

  // Persiste las filas que cambiaron respecto a `previa` (relaciones sincronizadas, fechas reprogramadas).
  const persistirCambios = async (finales, previa) => {
    const cambiadas = finales.filter((a) => {
      const antes = previa.find((p) => p.id === a.id);
      return a.id && antes && JSON.stringify(camposActividad(antes)) !== JSON.stringify(camposActividad(a));
    });
    if (cambiadas.length === 0) return;

    if (isSupabaseConfigured && supabase) {
      const resultados = await Promise.all(
        cambiadas.map((a) => supabase.from('actividades').update(camposActividad(a)).eq('id', a.id))
      );
      const fallo = resultados.find((r) => r.error);
      if (fallo) {
        console.error('Error al actualizar actividades relacionadas:', fallo.error);
        alert(`Error al actualizar actividades relacionadas: ${fallo.error.message}`);
      }
    } else {
      const porRow = new Map(cambiadas.map((a) => [a.id, a]));
      saveDemoActivities(getDemoActivities().map((a) => (porRow.has(a.id) ? { ...a, ...porRow.get(a.id) } : a)));
    }
  };

  // Actualiza campos sueltos del proyecto abierto (plazo, festivos)
  const handleUpdateProject = async (patch) => {
    if (!selectedProject) return;
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('proyectos').update(patch).eq('uuid_proyecto', selectedProject.uuid_proyecto);
      if (error) {
        console.error('Error al actualizar proyecto:', error);
        alert(`Error al actualizar el proyecto: ${error.message}`);
        return;
      }
    } else {
      saveDemoProjects(getDemoProjects().map((p) => (p.uuid_proyecto === selectedProject.uuid_proyecto ? { ...p, ...patch } : p)));
    }
    setSelectedProject((prev) => (prev ? { ...prev, ...patch } : prev));
    setProjects((prev) => prev.map((p) => (p.uuid_proyecto === selectedProject.uuid_proyecto ? { ...p, ...patch } : p)));
  };

  // Crea o actualiza una actividad: sincroniza relaciones, reprograma dependientes sin pasar del plazo y persiste los cambios
  const handleSaveActivity = async (actData) => {
    const previa = activities;
    const esNueva = !actData.id;
    const idAnterior = esNueva ? actData.id_actividad : previa.find((a) => a.id === actData.id)?.id_actividad;
    const fusionada = esNueva
      ? [...previa, { ...actData }]
      : previa.map((a) => (a.id === actData.id ? { ...a, ...actData } : a));

    // El traslape de la actividad editada se deduce de sus fechas y del fin de cada predecesora
    const editadaBase = fusionada.find((a) => a.id_actividad === actData.id_actividad);
    const editada = { ...editadaBase, traslapes: calcularTraslapes(editadaBase, fusionada) };
    fusionada[fusionada.indexOf(editadaBase)] = editada;
    // El plazo del proyecto no se extiende por reprogramación; los incumplimientos previos (p.ej. de un Excel) se respetan.
    const inicioProy = selectedProject?.inicio_proyecto;
    const finProy = selectedProject?.fin_proyecto;
    if ((inicioProy && editada.inicio_actividad < inicioProy) || (finProy && editada.fin_actividad > finProy)) {
      alert(`La actividad debe estar dentro del plazo del proyecto (${inicioProy} a ${finProy}).`);
      return;
    }
    const finProyecto = selectedProject?.fin_proyecto
      || [...previa, editada].reduce((max, a) => (a.fin_actividad > max ? a.fin_actividad : max), '');
    const { actividades: finales, movidas, excede } = reprogramarDependientes(
      sincronizarRelaciones(fusionada, editada, idAnterior),
      { finProyecto, ignorar: violaciones(previa) }
    );

    if (excede.length > 0) {
      alert(`No se puede guardar: reprogramar ${excede.map((m) => `#${m}`).join(', ')} extendería el plazo del proyecto (${finProyecto}). Ajuste las fechas o el traslape permitido.`);
      return;
    }

    if (movidas.length > 0 && !window.confirm(
      `Se reprogramarán las fechas de las actividades: ${movidas.map((m) => `#${m}`).join(', ')}.\n¿Continuar?`
    )) return;

    const final = finales.find((a) => a.id_actividad === actData.id_actividad);

    if (isSupabaseConfigured && supabase) {
      try {
        if (!esNueva) {
          const { error } = await supabase
            .from('actividades')
            .update(camposActividad(final))
            .eq('id', actData.id);

          if (error) {
            console.error('Error al actualizar actividad:', error);
            alert(`Error al actualizar actividad: ${error.message}`);
            return;
          }
        } else {
          const { error } = await supabase
            .from('actividades')
            .insert([{
              ...camposActividad(final),
              uuid_proyecto: actData.uuid_proyecto,
              uuid_usuario_dueno: user.id,
              uuids_usuarios_autorizados: actData.uuids_usuarios_autorizados || []
            }]);

          if (error) {
            console.error('Error al insertar actividad en Supabase:', error);
            alert(`Error al insertar actividad en Supabase:\nCódigo: ${error.code}\nMensaje: ${error.message}`);
            return;
          }
        }
        await persistirCambios(finales.filter((a) => a.id_actividad !== actData.id_actividad), previa);
        fetchActivities(selectedProject.uuid_proyecto);
      } catch (err) {
        console.error('Excepción al guardar actividad:', err);
        alert(`Error inesperado al guardar actividad: ${err.message}`);
      }
    } else {
      // Demo Mode
      const rowId = esNueva ? 'act-' + Math.random().toString(36).substring(2, 7) : actData.id;
      const guardada = { ...final, id: rowId };
      const vecinas = finales.filter((a) => a.id_actividad !== actData.id_actividad);
      const porRow = new Map([...vecinas, guardada].map((a) => [a.id, a]));
      const todas = getDemoActivities();
      const updated = esNueva
        ? [...todas.map((a) => (porRow.has(a.id) ? { ...a, ...porRow.get(a.id) } : a)), guardada]
        : todas.map((a) => (porRow.has(a.id) ? { ...a, ...porRow.get(a.id) } : a));
      saveDemoActivities(updated);
      setActivities(updated.filter((a) => a.uuid_proyecto === selectedProject.uuid_proyecto));
    }
  };

  // Guarda de una vez los cambios de fechas confirmados en el Gantt (lista de actividades completas con sus nuevas fechas)
  const handleSaveGanttChanges = async (cambios) => {
    const previa = activities;
    const porId = new Map(cambios.map((c) => [c.id_actividad, c]));
    const fusionada = previa.map((a) => (porId.has(a.id_actividad) ? { ...a, ...porId.get(a.id_actividad) } : a));
    const conTraslapes = fusionada.map((a) => (porId.has(a.id_actividad) ? { ...a, traslapes: calcularTraslapes(a, fusionada) } : a));

    // Las actividades movidas deben seguir dentro del plazo definido del proyecto
    const inicioProy = selectedProject?.inicio_proyecto;
    const finProy = selectedProject?.fin_proyecto;
    const fuera = conTraslapes.filter((a) => porId.has(a.id_actividad)
      && ((inicioProy && a.inicio_actividad < inicioProy) || (finProy && a.fin_actividad > finProy)));
    if (fuera.length > 0) {
      alert(`Fuera del plazo del proyecto (${inicioProy} a ${finProy}): ${fuera.map((a) => `#${a.id_actividad}`).join(', ')}.`);
      return;
    }

    // Reprograma dependientes una sola vez sin extender el plazo
    const finProyecto = finProy
      || conTraslapes.reduce((max, a) => (a.fin_actividad > max ? a.fin_actividad : max), '');
    const { actividades: finales, movidas, excede } = reprogramarDependientes(conTraslapes, {
      finProyecto,
      ignorar: violaciones(previa)
    });
    if (excede.length > 0) {
      alert(`No se pueden guardar los cambios: reprogramar ${excede.map((m) => `#${m}`).join(', ')} extendería el plazo del proyecto (${finProyecto}).`);
      return;
    }
    if (movidas.length > 0 && !window.confirm(
      `Se reprogramarán también las fechas de las actividades: ${movidas.map((m) => `#${m}`).join(', ')}.\n¿Continuar?`
    )) return;

    await persistirCambios(finales, previa);
    if (isSupabaseConfigured && supabase) {
      fetchActivities(selectedProject.uuid_proyecto);
    } else {
      setActivities(finales);
    }
  };

  // Elimina una actividad y la quita de las relaciones de las demás
  const handleDeleteActivity = async (idActividad) => {
    if (!window.confirm(`¿Eliminar la Actividad #${idActividad}?`)) return;

    const previa = activities;
    const restantes = quitarActividad(previa, idActividad);

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('actividades')
        .delete()
        .eq('uuid_proyecto', selectedProject.uuid_proyecto)
        .eq('id_actividad', idActividad);

      await persistirCambios(restantes, previa);
      fetchActivities(selectedProject.uuid_proyecto);
    } else {
      const porRow = new Map(restantes.map((a) => [a.id, a]));
      const updated = getDemoActivities()
        .filter((a) => !(a.uuid_proyecto === selectedProject.uuid_proyecto && a.id_actividad === idActividad))
        .map((a) => (porRow.has(a.id) ? { ...a, ...porRow.get(a.id) } : a));
      saveDemoActivities(updated);
      setActivities(updated.filter((a) => a.uuid_proyecto === selectedProject.uuid_proyecto));
    }
  };

  // Inserta de una vez las actividades leídas de un Excel (respeta sus fechas tal cual)
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

  // Cierra la sesión y limpia el estado de la pantalla
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

  // Proyectos que coinciden con el texto del buscador
  const filteredProjects = projects.filter(p => 
    p.nombre_proyecto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.descripcion_proyecto && p.descripcion_proyecto.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Permisos sobre el proyecto abierto: el dueño y los autorizados pueden editar
  const isCurrentProjectOwner = selectedProject && user && selectedProject.uuid_usuario_dueno === user.id;
  const isCurrentProjectAuthorized = selectedProject && user && (selectedProject.uuids_usuarios_autorizados || []).includes(user.id);
  const canEditSelectedProject = isCurrentProjectOwner || isCurrentProjectAuthorized;

  // Plazo del proyecto: fechas guardadas, o deducidas de las actividades si no se han definido
  const festivosProyecto = selectedProject?.festivos || [];
  const plazoProyecto = (() => {
    const inicioDef = selectedProject?.inicio_proyecto || null;
    const finDef = selectedProject?.fin_proyecto || null;
    const inicios = activities.map((a) => a.inicio_actividad).filter(Boolean).sort();
    const fines = activities.map((a) => a.fin_actividad).filter(Boolean).sort();
    return {
      inicio: inicioDef || inicios[0] || null,
      fin: finDef || fines[fines.length - 1] || null,
      definido: !!(inicioDef && finDef)
    };
  })();

  // Duración del proyecto en días calendario y hábiles (con los festivos del proyecto)
  const getProjectDuration = () => {
    const { inicio, fin } = plazoProyecto;
    if (!inicio || !fin || fin < inicio) return null;
    return {
      totalDays: diasCalendario(inicio, fin),
      businessDays: contarHabiles(inicio, fin, setFestivos(festivosProyecto))
    };
  };

  const projectDuration = getProjectDuration();

  // Botón del selector de vista (Tabla / Gantt / Curva S); resalta el modo activo
  const botonVista = (modo, icono, texto) => (
    <button onClick={() => setViewMode(modo)} className={viewMode === modo ? 'activo' : undefined}>
      {icono} {texto}
    </button>
  );

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
      <main className="pagina-principal">

        {/* Aviso: Supabase no está configurado, se usan datos locales de prueba */}
        {!isSupabaseConfigured && user && (
          <div className="glass-panel banner-demo">
            <div className="banner-demo-contenido">
              <Info size={22} color="#f59e0b" />
              <div>
                <strong className="banner-demo-titulo">Modo Demostración / Preview Activo</strong>
                <p className="texto-secundario">
                  Estás interactuando con datos de prueba locales. Para conectar con tu base de datos de Supabase y probar autenticación real, abre el instalador SQL.
                </p>
              </div>
            </div>
            <button onClick={() => setIsSqlModalOpen(true)} className="btn-secondary banner-demo-boton">
              Ver Script SQL
            </button>
          </div>
        )}

        {/* ENCABEZADO: detalle del proyecto abierto, o título y buscador de la lista */}
        {selectedProject ? (
          <div className="proyecto-detalle">
            {/* Volver a la lista de proyectos */}
            <button onClick={() => setSelectedProject(null)} className="btn-secondary proyecto-volver">
              <ArrowLeft size={16} />
              <span>Volver a la lista de proyectos</span>
            </button>

            {/* Panel de cabecera del proyecto */}
            <div className="glass-panel proyecto-cabecera">
              {/* Datos del proyecto */}
              <div>
                <div className="proyecto-insignias">
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

                <h2 className="proyecto-titulo gradient-text">{selectedProject.nombre_proyecto}</h2>
                <p className="proyecto-descripcion">
                  {selectedProject.descripcion_proyecto || 'Sin descripción.'}
                </p>

                {/* Duración del proyecto y accesos a su plazo y festivos */}
                {projectDuration && (
                  <p className="proyecto-duracion">
                    Duración proyecto: {projectDuration.businessDays} días hábiles [{projectDuration.totalDays} días calendario]
                    {canEditSelectedProject && (
                      <>
                        <button onClick={() => setIsPlazoModalOpen(true)} className="btn-secondary">
                          Editar plazo
                        </button>
                        <button onClick={() => setIsFestivosModalOpen(true)} className="btn-secondary">
                          Festivos{festivosProyecto.length > 0 ? ` (${festivosProyecto.length})` : ''}
                        </button>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Selector de vista y acciones sobre las actividades */}
              <div className="proyecto-acciones">
                <div className="conmutador-vista">
                  {botonVista('list', <ListChecks size={15} />, 'Tabla')}
                  {botonVista('gantt', <BarChart2 size={15} />, 'Diagrama Gantt')}
                  {botonVista('curvas', <TrendingUp size={15} />, 'Curva S')}
                </div>

                {canEditSelectedProject && (
                  <div className="acciones-actividad">
                    <button
                      onClick={() => setIsExcelModalOpen(true)}
                      className="btn-secondary boton-importar-excel"
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
          /* Encabezado de la lista de proyectos: título y buscador */
          <div className="proyectos-cabecera">
            <div>
              <h2 className="proyectos-titulo gradient-text">Proyectos Registrados</h2>
              <p className="proyectos-subtitulo">
                Gestiona tus proyectos y asigna autorizaciones a otros colaboradores por su UUID de Supabase.
              </p>
            </div>

            <div className="buscador">
              <Search size={16} color="var(--text-muted)" className="buscador-icono" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar proyecto por nombre..."
                className="input-field"
              />
            </div>
          </div>
        )}

        {/* CONTENIDO: vistas del proyecto abierto, o la rejilla de proyectos */}
        {selectedProject ? (
          <div>
            {/* Vista Diagrama de Gantt */}
            {viewMode === 'gantt' && (
              <GanttChart
                activities={activities}
                festivos={festivosProyecto}
                plazo={plazoProyecto}
                canEdit={canEditSelectedProject}
                onConfirmChanges={handleSaveGanttChanges}
              />
            )}

            {/* Vista Curva S */}
            {viewMode === 'curvas' && (
              <CurvaS activities={activities} />
            )}

            {/* Tabla de actividades (siempre visible bajo la vista elegida) */}
            <div className="glass-panel panel-actividades">
              <div className="panel-actividades-cabecera">
                <h3 className="panel-actividades-titulo">
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
          /* Rejilla de proyectos (o estado vacío si no hay ninguno) */
          filteredProjects.length === 0 ? (
            <div className="glass-panel proyectos-vacio">
              <FolderPlus size={48} color="var(--text-subtle)" style={{ marginBottom: '1rem' }} />
              <h3 className="proyectos-vacio-titulo">No se encontraron proyectos</h3>
              <p className="proyectos-vacio-texto">
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
            <div className="rejilla-proyectos">
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

      <PlazoProyectoModal
        isOpen={isPlazoModalOpen}
        onClose={() => setIsPlazoModalOpen(false)}
        onSave={handleUpdateProject}
        inicioActual={plazoProyecto.inicio}
        finActual={plazoProyecto.fin}
        actividades={activities}
        festivos={festivosProyecto}
      />

      <FestivosModal
        isOpen={isFestivosModalOpen}
        onClose={() => setIsFestivosModalOpen(false)}
        onSave={(festivos) => handleUpdateProject({ festivos })}
        festivos={festivosProyecto}
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
