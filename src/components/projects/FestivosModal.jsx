import React, { useState, useEffect, useRef } from 'react';
import { X, CalendarOff, Plus, Trash2, Upload, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Convierte una celda de Excel (serial, YYYY-MM-DD o DD/MM/YYYY) en YYYY-MM-DD, o null.
const aFecha = (val) => {
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null;
  }
  const str = String(val ?? '').trim();
  if (ISO.test(str)) return str;
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};

// Festivos del proyecto: se añaden a mano o se importan desde Excel (una fecha por celda).
export default function FestivosModal({ isOpen, onClose, onSave, festivos }) {
  const [lista, setLista] = useState([]);
  const [fecha, setFecha] = useState('');
  const [mensaje, setMensaje] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    setLista([...(festivos || [])].sort());
    setFecha('');
    setMensaje('');
  }, [isOpen, festivos]);

  if (!isOpen) return null;

  const agregar = (nuevas) => setLista([...new Set([...lista, ...nuevas])].sort());

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const fechas = filas.flat().map(aFecha).filter(Boolean);
      agregar(fechas);
      setMensaje(`${fechas.length} fecha(s) importada(s).`);
    } catch (err) {
      console.error('Error al importar festivos:', err);
      setMensaje('No se pudo leer el archivo Excel.');
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([['fecha'], ['2026-01-01'], ['2026-12-25']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Festivos');
    XLSX.writeFile(wb, 'plantilla_festivos.xlsx');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        {/* Encabezado */}
        <div className="modal-encabezado">
          <div className="grupo-titulo">
            <CalendarOff size={20} color="#f59e0b" />
            <h3 className="modal-titulo">Festivos del Proyecto</h3>
          </div>
          <button onClick={onClose} className="modal-cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="modal-cuerpo">
          <p className="texto-ayuda">
            Los festivos no cuentan como días hábiles (además de sábados y domingos).
          </p>

          {/* Alta manual de un festivo */}
          <div className="rejilla-agregar">
            <div>
              <label className="input-label">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-field" />
            </div>
            <button type="button" className="btn-secondary boton-agregar" title="Añadir festivo"
              onClick={() => { if (fecha) { agregar([fecha]); setFecha(''); } }}>
              <Plus size={16} />
            </button>
          </div>

          {/* Importación desde Excel y plantilla */}
          <div className="fila-botones">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
            <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> <span>Importar Excel</span>
            </button>
            <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>Plantilla</button>
            {mensaje && <span className="texto-mensaje">{mensaje}</span>}
          </div>

          {lista.length === 0 ? (
            <div className="aviso-vacio">
              No hay festivos registrados.
            </div>
          ) : (
            <div className="lista-registros">
              {lista.map((f) => (
                <div key={f} className="fila-registro">
                  <span>{f}</span>
                  <button type="button" onClick={() => setLista(lista.filter((x) => x !== f))}
                    className="boton-icono-peligro" title="Quitar">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Acciones */}
          <div className="modal-acciones">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="button" onClick={() => { onSave(lista); onClose(); }} className="btn-primary">
              <CheckCircle size={16} />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
