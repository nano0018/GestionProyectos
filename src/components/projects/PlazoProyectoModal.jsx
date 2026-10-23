import React, { useState, useEffect } from 'react';
import { X, CalendarRange, CheckCircle } from 'lucide-react';
import { contarHabiles, sumarHabiles, habilMasCercano, diasCalendario, setFestivos } from '../../lib/diasHabiles';

// Plazo del proyecto: fechas de inicio/fin y duración en días hábiles (se editan entre sí).
export default function PlazoProyectoModal({ isOpen, onClose, onSave, inicioActual, finActual, actividades, festivos }) {
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [error, setError] = useState('');
  const fest = setFestivos(festivos);

  useEffect(() => {
    setInicio(inicioActual || '');
    setFin(finActual || '');
    setError('');
  }, [isOpen, inicioActual, finActual]);

  if (!isOpen) return null;

  const habiles = inicio && fin && fin >= inicio ? contarHabiles(inicio, fin, fest) : 0;

  const handleInicio = (v) => {
    // Se conserva la duración en días hábiles: el fin se desplaza con el inicio
    const dur = Math.max(1, habiles);
    setInicio(v);
    if (v) setFin(sumarHabiles(habilMasCercano(v, fest, 1), dur, fest));
  };

  const handleDuracion = (v) => {
    const n = parseInt(v, 10);
    if (!inicio || !(n > 0)) return;
    setFin(sumarHabiles(habilMasCercano(inicio, fest, 1), n, fest));
  };

  const handleSave = () => {
    if (!inicio || !fin) return setError('Indique las fechas de inicio y fin.');
    if (fin < inicio) return setError('La fecha de fin no puede ser anterior al inicio.');
    const fuera = actividades.filter((a) => a.inicio_actividad < inicio || a.fin_actividad > fin);
    if (fuera.length > 0) {
      return setError(`Las actividades ${fuera.map((a) => `#${a.id_actividad}`).join(', ')} quedarían fuera del plazo. Ajuste primero sus fechas.`);
    }
    onSave({ inicio_proyecto: inicio, fin_proyecto: fin });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        {/* Encabezado */}
        <div className="modal-encabezado">
          <div className="grupo-titulo">
            <CalendarRange size={20} color="#6366f1" />
            <h3 className="modal-titulo">Plazo del Proyecto</h3>
          </div>
          <button onClick={onClose} className="modal-cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="modal-cuerpo">
          {error && (
            <div className="alerta-error">
              {error}
            </div>
          )}

          <div className="rejilla-2col">
            <div>
              <label className="input-label">Fecha inicio</label>
              <input type="date" value={inicio} onChange={(e) => handleInicio(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="input-label">Fecha fin</label>
              <input type="date" value={fin} min={inicio} onChange={(e) => setFin(e.target.value)} className="input-field" />
            </div>
          </div>

          <div>
            <label className="input-label">Duración (días hábiles)</label>
            <input type="number" min={1} value={habiles || ''} onChange={(e) => handleDuracion(e.target.value)}
              className="input-field campo-corto" />
            {inicio && fin >= inicio && (
              <p className="ayuda-campo">
                {diasCalendario(inicio, fin)} días calendario. Lunes a viernes, sin contar los festivos configurados.
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="modal-acciones">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="button" onClick={handleSave} className="btn-primary">
              <CheckCircle size={16} />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
