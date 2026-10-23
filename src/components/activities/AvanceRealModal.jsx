import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Trash2, Plus, CheckCircle } from 'lucide-react';
import { ultimoAvance } from '../../lib/curvaS';

const ordenar = (lista) => [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha));

export default function AvanceRealModal({ isOpen, onClose, onSave, activity }) {
  const [registros, setRegistros] = useState([]);
  const [fecha, setFecha] = useState('');
  const [avance, setAvance] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activity) return;
    setRegistros(ordenar(activity.historial_avance || []));
    setFecha(new Date().toISOString().split('T')[0]);
    setAvance('');
    setError('');
  }, [activity, isOpen]);

  if (!isOpen || !activity) return null;

  const handleAdd = () => {
    const num = parseFloat(avance);
    if (!fecha) return setError('Seleccione la fecha del avance.');
    if (Number.isNaN(num) || num < 0 || num > 100) return setError('El avance debe estar entre 0 y 100.');
    if (fecha < activity.inicio_actividad || fecha > activity.fin_actividad) {
      return setError(`La fecha debe estar entre ${activity.inicio_actividad} y ${activity.fin_actividad}.`);
    }
    // Una entrada por fecha: si ya existe, se reemplaza
    setRegistros(ordenar([...registros.filter((r) => r.fecha !== fecha), { fecha, avance: num }]));
    setAvance('');
    setError('');
  };

  const handleSave = () => {
    onSave({ ...activity, historial_avance: registros, avance_real: ultimoAvance(registros) });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>

        {/* Encabezado */}
        <div className="modal-encabezado">
          <div className="grupo-titulo">
            <TrendingUp size={20} color="#10b981" />
            <h3 className="modal-titulo">
              Avance Real - Actividad #{activity.id_actividad}
            </h3>
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

          <p className="texto-ayuda">
            {activity.nombre_actividad}. Registre el avance acumulado (%) en fechas concretas; la Curva S real usa estos puntos.
          </p>

          {/* Alta de un registro: fecha, avance acumulado y botón añadir */}
          <div className="rejilla-agregar con-avance">
            <div>
              <label className="input-label">Fecha</label>
              <input type="date" value={fecha} min={activity.inicio_actividad} max={activity.fin_actividad}
                onChange={(e) => setFecha(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="input-label">Avance (%)</label>
              <input type="number" min={0} max={100} step={1} value={avance}
                onChange={(e) => setAvance(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                className="input-field" />
            </div>
            <button type="button" onClick={handleAdd} className="btn-secondary boton-agregar" title="Añadir registro">
              <Plus size={16} />
            </button>
          </div>

          {/* Registros existentes, ordenados por fecha */}
          {registros.length === 0 ? (
            <div className="aviso-vacio">
              Aún no hay avances registrados.
            </div>
          ) : (
            <div className="lista-registros">
              {registros.map((r) => (
                <div key={r.fecha} className="fila-registro">
                  <span className="registro-fecha">{r.fecha}</span>
                  <span className="registro-valor">{Number(r.avance).toFixed(0)}%</span>
                  <button type="button" onClick={() => setRegistros(registros.filter((x) => x.fecha !== r.fecha))}
                    className="boton-icono-peligro" title="Eliminar registro">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
