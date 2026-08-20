import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, Upload, Check, AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ActivityExcelModal({ 
  isOpen, 
  onClose, 
  onImportActivities, 
  existingActivities, 
  currentProjectId, 
  currentUser 
}) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // 1. Download Plantilla Excel
  const handleDownloadTemplate = () => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const addDays = (d, days) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + days);
      return formatDate(copy);
    };

    const templateData = [
      {
        'id_actividad': 1,
        'nombre_actividad': 'Análisis de Requerimientos y Alcance',
        'actividades_predecesoras': '',
        'actividades_dependientes': '2;3',
        'inicio_actividad': formatDate(today),
        'fin_actividad': addDays(today, 4),
        'avance_real': 0
      },
      {
        'id_actividad': 2,
        'nombre_actividad': 'Diseño de la Arquitectura de Datos',
        'actividades_predecesoras': '1',
        'actividades_dependientes': '4',
        'inicio_actividad': addDays(today, 5),
        'fin_actividad': addDays(today, 10),
        'avance_real': 0
      },
      {
        'id_actividad': 3,
        'nombre_actividad': 'Prototipado de Interfaz de Usuario UI/UX',
        'actividades_predecesoras': '1',
        'actividades_dependientes': '4',
        'inicio_actividad': addDays(today, 5),
        'fin_actividad': addDays(today, 9),
        'avance_real': 0
      },
      {
        'id_actividad': 4,
        'nombre_actividad': 'Desarrollo e Integración de Módulos',
        'actividades_predecesoras': '2;3',
        'actividades_dependientes': '5',
        'inicio_actividad': addDays(today, 11),
        'fin_actividad': addDays(today, 18),
        'avance_real': 0
      },
      {
        'id_actividad': 5,
        'nombre_actividad': 'Pruebas de Aceptación y Despliegue',
        'actividades_predecesoras': '4',
        'actividades_dependientes': '',
        'inicio_actividad': addDays(today, 19),
        'fin_actividad': addDays(today, 22),
        'avance_real': 0
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Styling column widths
    worksheet['!cols'] = [
      { wch: 12 }, // id_actividad
      { wch: 45 }, // nombre_actividad
      { wch: 25 }, // actividades_predecesoras
      { wch: 25 }, // actividades_dependientes
      { wch: 18 }, // inicio_actividad
      { wch: 18 }, // fin_actividad
      { wch: 14 }  // avance_real
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Actividades');
    XLSX.writeFile(workbook, 'plantilla_importacion_actividades.xlsx');
  };

  // Helper to parse integer array from string like "1;2" or "1, 2" or "[1;2]"
  const parseIdsArray = (val) => {
    if (val === undefined || val === null) return [];
    if (typeof val === 'number') return [val];
    const str = String(val).replace(/[\[\]]/g, '').trim();
    if (!str) return [];
    
    // Split by semicolon, comma, or whitespace
    return str
      .split(/[;,]/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0 && n <= 100);
  };

  // Helper to parse avance_real as a 0-100 number, defaulting to 0
  const parseAvanceReal = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(100, num));
  };

  // Helper to convert Excel date values or date strings to YYYY-MM-DD
  const formatExcelDate = (val) => {
    if (!val) return new Date().toISOString().split('T')[0];
    
    // If Excel serial number (e.g., 45150)
    if (typeof val === 'number') {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const yyyy = dateObj.y;
        const mm = String(dateObj.m).padStart(2, '0');
        const dd = String(dateObj.d).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }

    const parsedDate = new Date(val);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  };

  // 2. Handle File Selection & Parsing
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setErrorMsg('');
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setErrorMsg('El archivo Excel no contiene filas de actividades.');
          setParsedRows([]);
          setIsProcessing(false);
          return;
        }

        // Auto-assign start ID
        let currentMaxId = existingActivities.reduce((max, act) => Math.max(max, act.id_actividad || 0), 0);

        const processed = rawJson.map((row, index) => {
          // Normalize column keys (case-insensitive & whitespace trimmed)
          const normalized = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim().toLowerCase();
            normalized[cleanKey] = row[key];
          });

          const nombre = normalized['nombre_actividad'] || normalized['nombre'] || normalized['actividad'] || `Actividad ${index + 1}`;
          
          let numId = parseInt(normalized['id_actividad'] || normalized['id'], 10);
          if (isNaN(numId) || numId < 1 || numId > 100) {
            currentMaxId = Math.min(currentMaxId + 1, 100);
            numId = currentMaxId;
          } else {
            currentMaxId = Math.max(currentMaxId, numId);
          }

          const predecesoras = parseIdsArray(normalized['actividades_predecesoras'] || normalized['predecesoras']);
          const dependientes = parseIdsArray(normalized['actividades_dependientes'] || normalized['dependientes']);
          
          const inicio = formatExcelDate(normalized['inicio_actividad'] || normalized['inicio'] || normalized['fecha_inicio']);
          const fin = formatExcelDate(normalized['fin_actividad'] || normalized['fin'] || normalized['fecha_fin']);
          const avanceReal = parseAvanceReal(normalized['avance_real'] ?? normalized['avance']);

          return {
            id_actividad: numId,
            uuid_proyecto: currentProjectId,
            nombre_actividad: String(nombre).trim(),
            actividades_predecesoras: predecesoras,
            actividades_dependientes: dependientes,
            inicio_actividad: inicio,
            fin_actividad: fin >= inicio ? fin : inicio,
            avance_real: avanceReal,
            uuid_usuario_dueno: currentUser?.id,
            uuids_usuarios_autorizados: []
          };
        });

        setParsedRows(processed);
      } catch (err) {
        console.error('Error al procesar archivo Excel:', err);
        setErrorMsg('Error al leer el archivo Excel. Asegúrese de que tenga formato .xlsx o .xls válido.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  // 3. Confirm Import
  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;
    onImportActivities(parsedRows);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileSpreadsheet size={22} color="#10b981" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Importar Actividades desde Excel (.xlsx)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Descarga la plantilla o sube tu archivo diligenciado
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          
          {/* Action Cards: Download Template vs Upload */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            
            {/* Download Template Box */}
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                  <Download size={18} />
                  <span>1. Descargar Plantilla</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Obtén el formato oficial `.xlsx` pre-configurado con las columnas y formatos correctos.
                </p>
              </div>

              <button 
                onClick={handleDownloadTemplate}
                className="btn-secondary"
                style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', fontSize: '0.82rem', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#6ee7b7' }}
              >
                <Download size={15} />
                <span>Descargar plantilla.xlsx</span>
              </button>
            </div>

            {/* Upload File Box */}
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a5b4fc', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                  <Upload size={18} />
                  <span>2. Subir Archivo Diligenciado</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Selecciona tu archivo `.xlsx` o `.xls` para procesar y cargar las actividades al proyecto.
                </p>
              </div>

              <label className="btn-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', fontSize: '0.82rem', cursor: 'pointer' }}>
                <Upload size={15} />
                <span>{file ? file.name : 'Seleccionar Archivo Excel'}</span>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

          </div>

          {/* Errors */}
          {errorMsg && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} color="#f43f5e" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {parsedRows.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="input-label" style={{ margin: 0, color: '#10b981' }}>
                  Vista Previa ({parsedRows.length} actividades listas para importar)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  IDs asignados automáticamente (1 - 100)
                </span>
              </div>

              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '10px', background: 'rgba(0,0,0,0.3)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-glass)', textTransform: 'uppercase', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>#ID</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Nombre Actividad</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Predecesoras</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Dependientes</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Fechas (Inicio - Fin)</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Avance Real</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#a5b4fc' }}>#{row.id_actividad}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-main)', fontWeight: 600 }}>{row.nombre_actividad}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#fcd34d' }}>{row.actividades_predecesoras.length > 0 ? `[${row.actividades_predecesoras.join(';')}]` : '-'}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#a5b4fc' }}>{row.actividades_dependientes.length > 0 ? `[${row.actividades_dependientes.join(';')}]` : '-'}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.inicio_actividad} → {row.fin_actividad}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#6ee7b7', fontWeight: 600 }}>{row.avance_real}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button 
            onClick={handleConfirmImport} 
            className="btn-primary"
            disabled={parsedRows.length === 0 || isProcessing}
            style={{ opacity: parsedRows.length === 0 ? 0.5 : 1 }}
          >
            <Check size={16} />
            <span>Confirmar e Importar {parsedRows.length > 0 ? `(${parsedRows.length})` : ''}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
