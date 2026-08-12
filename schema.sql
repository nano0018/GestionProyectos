-- ======================================================
-- ESQUEMA SQL PARA SUPABASE - SEGUIMIENTO DE PROYECTOS
-- Copia y ejecuta este script en el SQL Editor de Supabase
-- ======================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: proyectos
CREATE TABLE IF NOT EXISTS public.proyectos (
    uuid_proyecto UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_proyecto TEXT NOT NULL,
    descripcion_proyecto TEXT,
    componentes INT DEFAULT 1 CHECK (componentes >= 1 AND componentes <= 10),
    uuid_usuario_dueno UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uuids_usuarios_autorizados UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA: actividades
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

-- 4. FUNCIÓN Y TRIGGER: Asignación automática de id_actividad (1 a 100 por proyecto)
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

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE SEGURIDAD PARA PROYECTOS

-- Lectura: El dueño o usuarios en la lista de autorizados
DROP POLICY IF EXISTS "Proyectos accesibles por dueño o autorizados" ON public.proyectos;
CREATE POLICY "Proyectos accesibles por dueño o autorizados"
ON public.proyectos FOR SELECT
TO authenticated
USING (
    auth.uid() = uuid_usuario_dueno
    OR auth.uid() = ANY(uuids_usuarios_autorizados)
);

-- Inserción: Cualquier usuario autenticado puede crear un proyecto (siendo él el dueño)
DROP POLICY IF EXISTS "Creación de proyectos" ON public.proyectos;
CREATE POLICY "Creación de proyectos"
ON public.proyectos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uuid_usuario_dueno);

-- Actualización: El dueño o los autorizados pueden editar datos del proyecto
DROP POLICY IF EXISTS "Edición de proyectos" ON public.proyectos;
CREATE POLICY "Edición de proyectos"
ON public.proyectos FOR UPDATE
TO authenticated
USING (
    auth.uid() = uuid_usuario_dueno
    OR auth.uid() = ANY(uuids_usuarios_autorizados)
);

-- Eliminación: Solo el dueño puede borrar el proyecto
DROP POLICY IF EXISTS "Eliminación de proyectos" ON public.proyectos;
CREATE POLICY "Eliminación de proyectos"
ON public.proyectos FOR DELETE
TO authenticated
USING (auth.uid() = uuid_usuario_dueno);

-- 7. POLÍTICAS DE SEGURIDAD PARA ACTIVIDADES

-- Lectura: El dueño de la actividad, autorizados de la actividad, o autorizados del proyecto contenedor
DROP POLICY IF EXISTS "Actividades accesibles por dueño o autorizados" ON public.actividades;
CREATE POLICY "Actividades accesibles por dueño o autorizados"
ON public.actividades FOR SELECT
TO authenticated
USING (
    auth.uid() = uuid_usuario_dueno
    OR auth.uid() = ANY(uuids_usuarios_autorizados)
    OR EXISTS (
        SELECT 1 FROM public.proyectos p
        WHERE p.uuid_proyecto = actividades.uuid_proyecto
          AND (p.uuid_usuario_dueno = auth.uid() OR auth.uid() = ANY(p.uuids_usuarios_autorizados))
    )
);

-- Inserción/Edición/Eliminación: Permitida para dueños y usuarios con acceso al proyecto
DROP POLICY IF EXISTS "Gestión de actividades por autorizados del proyecto" ON public.actividades;
CREATE POLICY "Gestión de actividades por autorizados del proyecto"
ON public.actividades FOR ALL
TO authenticated
USING (
    auth.uid() = uuid_usuario_dueno
    OR auth.uid() = ANY(uuids_usuarios_autorizados)
    OR EXISTS (
        SELECT 1 FROM public.proyectos p
        WHERE p.uuid_proyecto = actividades.uuid_proyecto
          AND (p.uuid_usuario_dueno = auth.uid() OR auth.uid() = ANY(p.uuids_usuarios_autorizados))
    )
);
