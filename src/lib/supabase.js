import { createClient } from '@supabase/supabase-js';

const env = import.meta.env ?? {};
const supabaseUrl = env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

const SESSION_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const SESSION_STARTED_KEY = 'supabase_session_started_at';

export const markSessionStart = () => {
  if (typeof window !== 'undefined' && !localStorage.getItem(SESSION_STARTED_KEY)) {
    localStorage.setItem(SESSION_STARTED_KEY, Date.now().toString());
  }
};

export const isSessionExpired = () => {
  if (typeof window === 'undefined') return false;
  const started = localStorage.getItem(SESSION_STARTED_KEY);
  if (!started) return false;
  return Date.now() - parseInt(started, 10) > SESSION_EXPIRY_MS;
};

export const clearSessionStart = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_STARTED_KEY);
  }
};

// Mock storage keys for demo preview mode when Supabase credentials are not added yet
const DEMO_PROJECTS_KEY = 'demo_tracker_projects';
const DEMO_ACTIVITIES_KEY = 'demo_tracker_activities';
const DEMO_USER_KEY = 'demo_tracker_user';

export const getInitialDemoUser = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(DEMO_USER_KEY);
  if (stored) return JSON.parse(stored);
  const newUser = {
    id: 'user-demo-1111-2222-333344445555',
    email: 'demouser@empresa.com'
  };
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser));
  return newUser;
};

export const getDemoProjects = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(DEMO_PROJECTS_KEY);
  if (stored) return JSON.parse(stored);
  
  const initial = [
    {
      uuid_proyecto: 'p-101-demo-uuid',
      nombre_proyecto: 'Modernización Plataforma E-commerce',
      descripcion_proyecto: 'Rediseño de interfaz, integración de pasarelas y migración a arquitectura cloud.',
      componentes: 5,
      uuid_usuario_dueno: 'user-demo-1111-2222-333344445555',
      uuids_usuarios_autorizados: ['colab-8888-9999-000011112222'],
      created_at: new Date().toISOString()
    },
    {
      uuid_proyecto: 'p-102-demo-uuid',
      nombre_proyecto: 'Implementación ERP Financiero',
      descripcion_proyecto: 'Módulo de tesorería, facturación electrónica y reportes normativos.',
      componentes: 3,
      uuid_usuario_dueno: 'user-demo-1111-2222-333344445555',
      uuids_usuarios_autorizados: [],
      created_at: new Date().toISOString()
    }
  ];
  localStorage.setItem(DEMO_PROJECTS_KEY, JSON.stringify(initial));
  return initial;
};

export const getDemoActivities = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(DEMO_ACTIVITIES_KEY);
  if (stored) return JSON.parse(stored);

  const today = new Date();
  const formatDate = (d) => d.toISOString().split('T')[0];
  
  const addDays = (d, days) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return formatDate(res);
  };

  const initial = [
    {
      id: 'act-1',
      id_actividad: 1,
      uuid_proyecto: 'p-101-demo-uuid',
      nombre_actividad: 'Levantamiento de Requerimientos y Arquitectura',
      actividades_predecesoras: [],
      actividades_dependientes: [2, 3],
      inicio_actividad: formatDate(today),
      fin_actividad: addDays(today, 5),
      avance_real: 35,
      uuid_usuario_dueno: 'user-demo-1111-2222-333344445555',
      uuids_usuarios_autorizados: []
    },
    {
      id: 'act-2',
      id_actividad: 2,
      uuid_proyecto: 'p-101-demo-uuid',
      nombre_actividad: 'Diseño de Sistema UI/UX & Prototiptado',
      actividades_predecesoras: [1],
      actividades_dependientes: [4],
      inicio_actividad: addDays(today, 6),
      fin_actividad: addDays(today, 12),
      avance_real: 0,
      uuid_usuario_dueno: 'user-demo-1111-2222-333344445555',
      uuids_usuarios_autorizados: []
    },
    {
      id: 'act-3',
      id_actividad: 3,
      uuid_proyecto: 'p-101-demo-uuid',
      nombre_actividad: 'Configuración de Esquema Supabase DB & Auth',
      actividades_predecesoras: [1],
      actividades_dependientes: [4],
      inicio_actividad: addDays(today, 6),
      fin_actividad: addDays(today, 10),
      avance_real: 0,
      uuid_usuario_dueno: 'user-demo-1111-2222-333344445555',
      uuids_usuarios_autorizados: []
    },
    {
      id: 'act-4',
      id_actividad: 4,
      uuid_proyecto: 'p-101-demo-uuid',
      nombre_actividad: 'Desarrollo de Componentes Frontend & Conexión API',
      actividades_predecesoras: [2, 3],
      actividades_dependientes: [5],
      inicio_actividad: addDays(today, 13),
      fin_actividad: addDays(today, 20),
      avance_real: 0,
      uuid_usuario_dueno: 'user-demo-1111-2222-333344445555',
      uuids_usuarios_autorizados: []
    },
    {
      id: 'act-5',
      id_actividad: 5,
      uuid_proyecto: 'p-101-demo-uuid',
      nombre_actividad: 'Pruebas de Integración y Despliegue',
      actividades_predecesoras: [4],
      actividades_dependientes: [],
      inicio_actividad: addDays(today, 21),
      fin_actividad: addDays(today, 25),
      avance_real: 0,
      uuid_usuario_dueno: 'user-demo-1111-2222-333344445555',
      uuids_usuarios_autorizados: []
    }
  ];
  localStorage.setItem(DEMO_ACTIVITIES_KEY, JSON.stringify(initial));
  return initial;
};

export const saveDemoProjects = (projects) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_PROJECTS_KEY, JSON.stringify(projects));
  }
};

export const saveDemoActivities = (activities) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_ACTIVITIES_KEY, JSON.stringify(activities));
  }
};
