import React, { useState } from 'react';
import { X, Copy, Check, Database, ShieldAlert, Sparkles } from 'lucide-react';

const SQL_SCRIPT = `-- ======================================================
-- ESQUEMA SQL PARA SUPABASE - SEGUIMIENTO DE PROYECTOS
-- Copia y ejecuta este script en el SQL Editor de Supabase
-- ======================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLA 1: PROYECTOS
CREATE TABLE IF NOT EXISTS public.proyectos (
    uuid_proyecto UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_proyecto TEXT NOT NULL,
    descripcion_proyecto TEXT,
    componentes INT DEFAULT 1 CHECK (componentes >= 1 AND componentes <= 10),
    uuid_usuario_dueno UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uuids_usuarios_autorizados UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA 2: ACTIVIDADES
CREATE TABLE IF NOT EXISTS public.actividades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_actividad INT NOT NULL CHECK (id_actividad >= 1 AND id_actividad <= 100),
    uuid_proyecto UUID NOT NULL REFERENCES public.proyectos(uuid_proyecto) ON DELETE CASCADE,
    nombre_actividad TEXT NOT NULL,
    actividades_predecesoras INT[] DEFAULT '{}',
    actividades_dependientes INT[] DEFAULT '{}',
    inicio_actividad DATE NOT NULL,
    fin_actividad DATE NOT NULL CHECK (fin_actividad >= inicio_actividad),
    uuid_usuario_dueno UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uuids_usuarios_autorizados UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_proyecto_id_actividad UNIQUE (uuid_proyecto, id_actividad)
);

-- TRIGGER PARA ASIGNAR AUTOMÁTICAMENTE id_actividad (1 a 100 por proyecto)
CREATE OR REPLACE FUNCTION set_next_id_actividad()
RETURNS TRIGGER AS $$
DECLARE
    next_id INT;
BEGIN
    IF NEW.id_actividad IS NULL OR NEW.id_actividad = 0 THEN
        SELECT COALESCE(MAX(id_actividad), 0) + 1 INTO next_id
        FROM public.actividades
        WHERE uuid_proyecto = NEW.uuid_proyecto;

        IF next_id > 100 THEN
            RAISE EXCEPTION 'El proyecto no puede exceder el límite de 100 actividades.';
        END IF;

        NEW.id_actividad := next_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_next_id_actividad ON public.actividades;
CREATE TRIGGER trg_set_next_id_actividad
BEFORE INSERT ON public.actividades
FOR EACH ROW
EXECUTE FUNCTION set_next_id_actividad();

-- HABILITAR SEGURIDAD RLS Y POLÍTICAS DE ACCESO
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PROYECTOS
DROP POLICY IF EXISTS "Proyectos accesibles por dueño o autorizados" ON public.proyectos;
CREATE POLICY "Proyectos accesibles por dueño o autorizados"
ON public.proyectos FOR SELECT TO authenticated
USING (auth.uid() = uuid_usuario_dueno OR auth.uid() = ANY(uuids_usuarios_autorizados));

DROP POLICY IF EXISTS "Creación de proyectos" ON public.proyectos;
CREATE POLICY "Creación de proyectos"
ON public.proyectos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uuid_usuario_dueno);

DROP POLICY IF EXISTS "Edición de proyectos" ON public.proyectos;
CREATE POLICY "Edición de proyectos"
ON public.proyectos FOR UPDATE TO authenticated
USING (auth.uid() = uuid_usuario_dueno OR auth.uid() = ANY(uuids_usuarios_autorizados));

DROP POLICY IF EXISTS "Eliminación de proyectos" ON public.proyectos;
CREATE POLICY "Eliminación de proyectos"
ON public.proyectos FOR DELETE TO authenticated
USING (auth.uid() = uuid_usuario_dueno);

-- POLÍTICAS ACTIVIDADES
DROP POLICY IF EXISTS "Actividades accesibles por dueño o autorizados" ON public.actividades;
CREATE POLICY "Actividades accesibles por dueño o autorizados"
ON public.actividades FOR SELECT TO authenticated
USING (
    auth.uid() = uuid_usuario_dueno
    OR auth.uid() = ANY(uuids_usuarios_autorizados)
    OR EXISTS (
        SELECT 1 FROM public.proyectos p
        WHERE p.uuid_proyecto = actividades.uuid_proyecto
          AND (p.uuid_usuario_dueno = auth.uid() OR auth.uid() = ANY(p.uuids_usuarios_autorizados))
    )
);

DROP POLICY IF EXISTS "Gestión de actividades por autorizados del proyecto" ON public.actividades;
CREATE POLICY "Gestión de actividades por autorizados del proyecto"
ON public.actividades FOR ALL TO authenticated
USING (
    auth.uid() = uuid_usuario_dueno
    OR auth.uid() = ANY(uuids_usuarios_autorizados)
    OR EXISTS (
        SELECT 1 FROM public.proyectos p
        WHERE p.uuid_proyecto = actividades.uuid_proyecto
          AND (p.uuid_usuario_dueno = auth.uid() OR auth.uid() = ANY(p.uuids_usuarios_autorizados))
    )
);
`;

export default function SqlSetupModal({ isOpen, onClose, isConfigured }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={20} color="#a5b4fc" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Script SQL para Supabase</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {isConfigured ? 'Conexión a Supabase activa' : 'Configura tu BD en Supabase con este código'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {!isConfigured && (
            <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <ShieldAlert size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: '#fcd34d' }}>
                <strong>Instrucciones para activar Supabase real:</strong>
                <ol style={{ marginLeft: '1.2rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                  <li>Crea un proyecto en Supabase (supabase.com)</li>
                  <li>Ve a <strong>SQL Editor</strong> en Supabase, pega el script de abajo y haz clic en <strong>Run</strong></li>
                  <li>Agrega tus claves en `.env`: <code>PUBLIC_SUPABASE_URL</code> y <code>PUBLIC_SUPABASE_ANON_KEY</code></li>
                </ol>
              </div>
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="input-label" style={{ margin: 0 }}>Código SQL Completo (Tablas, Triggers y RLS)</span>
              <button 
                onClick={handleCopy}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <pre style={{ 
              background: '#090d16', 
              border: '1px solid var(--border-glass)', 
              borderRadius: '10px', 
              padding: '1rem', 
              fontSize: '0.78rem', 
              color: '#a5b4fc', 
              maxHeight: '320px', 
              overflowY: 'auto',
              fontFamily: 'monospace',
              lineHeight: 1.4
            }}>
              {SQL_SCRIPT}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-primary" style={{ fontSize: '0.85rem' }}>
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
