import React, { useState, useEffect } from 'react';
import { sincronizarRelaciones, tieneCiclo, calcularTraslapes, fechasParaTraslape } from '../../lib/dependencias';
import { X, Calendar, CheckCircle, ListChecks, Link, ArrowRightLeft, TrendingUp } from 'lucide-react';

const clampAvance = (val) => {
  const num = parseFloat(val);
  if (Number.isNaN(num)) return NaN;
  return Math.max(0, Math.min(100, num));
};

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
  const [avanceReal, setAvanceReal] = useState(0);
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
      setAvanceReal(activityToEdit.avance_real ?? 0);
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
      setAvanceReal(0);
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

    const numAvanceReal = clampAvance(avanceReal);
    if (Number.isNaN(numAvanceReal)) {
      setError('El avance real debe ser un número entre 0 y 100.');
      return;
    }

    const candidata = {
      ...activityToEdit,
      id_actividad: numId,
      actividades_predecesoras: predecesoras,
      actividades_dependientes: dependientes
    };
    const hipotetica = activityToEdit
      ? existingActivities.map((a) => (a.id === activityToEdit.id ? candidata : a))
      : [...existingActivities, candidata];
    if (hipotetica.filter((a) => a.id_actividad === numId).length > 1) {
      setError(`Ya existe otra actividad con el ID #${numId}.`);
      return;
    }
    if (tieneCiclo(sincronizarRelaciones(hipotetica, candidata, activityToEdit?.id_actividad ?? numId))) {
      setError('Las predecesoras/dependientes seleccionadas crean un ciclo entre actividades.');
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
      avance_real: numAvanceReal,
      historial_avance: activityToEdit?.historial_avance || [],
      uuid_usuario_dueno: activityToEdit ? activityToEdit.uuid_usuario_dueno : currentUser.id,
      uuids_usuarios_autorizados: activityToEdit ? activityToEdit.uuids_usuarios_autorizados : []
    });

    onClose();
  };

  // Actividades que se pueden elegir como relacionadas (todas menos la que se edita)
  const otherActivities = existingActivities.filter(
    act => !activityToEdit || act.id_actividad !== activityToEdit.id_actividad
  );

  // Cambia el traslape con una predecesora: mueve inicio y fin conservando la duración
  const handleCambiarTraslape = (predecesora, valor) => {
    const dias = Math.max(0, parseInt(valor, 10) || 0);
    const nuevas = fechasParaTraslape({ inicio_actividad: inicio, fin_actividad: fin }, predecesora, dias);
    setInicio(nuevas.inicio);
    setFin(nuevas.fin);
  };

  // Traslape actual (días) con una predecesora, calculado desde las fechas del formulario
  const traslapeActual = (predecesora) => (
    calcularTraslapes(
      { inicio_actividad: inicio, actividades_predecesoras: [predecesora.id_actividad] },
      existingActivities
    )[predecesora.id_actividad] ?? 0
  );

  // Lista con casillas de las demás actividades; `extra` agrega contenido a la opción marcada
  const selectorActividades = (seleccionadas, onToggle, mensajeVacio, extra) => (
    otherActivities.length === 0 ? (
      <div className="selector-vacio">{mensajeVacio}</div>
    ) : (
      <div className="selector-actividades">
        {otherActivities.map(act => (
          <label key={act.id_actividad} className="selector-opcion">
            <input
              type="checkbox"
              checked={seleccionadas.includes(act.id_actividad)}
              onChange={() => onToggle(act.id_actividad)}
            />
            <span>#{act.id_actividad} - {act.nombre_actividad}</span>
            {extra && seleccionadas.includes(act.id_actividad) && extra(act)}
          </label>
        ))}
      </div>
    )
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>

        {/* Encabezado */}
        <div className="modal-encabezado">
          <div className="grupo-titulo">
            <ListChecks size={20} color="#6366f1" />
            <h3 className="modal-titulo">
              {activityToEdit ? `Editar Actividad #${activityToEdit.id_actividad}` : `Nueva Actividad (#${idActividad})`}
            </h3>
          </div>
          <button onClick={onClose} className="modal-cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="modal-cuerpo">

          {error && <div className="alerta-error">{error}</div>}

          {/* Nombre e ID */}
          <div className="rejilla-nombre-id">
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

          {/* Fechas de inicio y fin (YYYY-MM-DD) */}
          <div className="rejilla-2col">
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

          {/* Avance real */}
          <div>
            <label className="input-label etiqueta-con-icono">
              <TrendingUp size={14} color="#10b981" />
              Avance Real (%)
            </label>
            <p className="ayuda-seccion">
              Porcentaje de avance real registrado manualmente. Se usa para la Curva S del proyecto.
            </p>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={avanceReal}
              onChange={(e) => setAvanceReal(e.target.value)}
              className="input-field campo-corto"
            />
          </div>

          {/* Predecesoras: cada una marcada muestra su traslape */}
          <div>
            <label className="input-label">Actividades Predecesoras</label>
            <p className="ayuda-seccion">
              Seleccione las actividades que deben finalizar antes de iniciar esta. El número a la derecha es el traslape: días que esta actividad empieza antes del fin de la predecesora. Se calcula con las fechas; al cambiarlo se mueven las fechas de inicio y fin.
            </p>
            {selectorActividades(
              predecesoras,
              handleTogglePredecesora,
              'No hay otras actividades registradas aún en este proyecto.',
              (act) => (
                <input
                  type="number"
                  min={0}
                  value={traslapeActual(act)}
                  onChange={(e) => handleCambiarTraslape(act, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  title="Traslape (días): se calcula desde el fin de la predecesora. Al modificarlo se mueven las fechas de inicio y fin de esta actividad"
                  className="input-traslape"
                />
              )
            )}
          </div>

          {/* Dependientes */}
          <div>
            <label className="input-label">Actividades Dependientes</label>
            <p className="ayuda-seccion">
              Seleccione las actividades que dependen del término de esta. La relación se sincroniza en ambas actividades y,
              si es necesario, se reprograman las fechas de las dependientes.
            </p>
            {selectorActividades(dependientes, handleToggleDependiente, 'No hay otras actividades para vincular.')}
          </div>

          {/* Acciones */}
          <div className="modal-acciones separada">
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
