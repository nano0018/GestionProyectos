// Suite de tests unitarios para los helpers de sesión y datos demo de src/lib/supabase.js
import {
  markSessionStart,
  isSessionExpired,
  clearSessionStart,
  getInitialDemoUser,
  getDemoProjects,
  getDemoActivities,
  saveDemoProjects,
  saveDemoActivities,
} from '../../src/lib/supabase.js';

// Clave usada por el módulo para guardar el inicio de sesión en localStorage
const SESSION_STARTED_KEY = 'supabase_session_started_at';
// Duración de la sesión: 2 días (equivalente a la constante SESSION_EXPIRY_MS del módulo)
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// ===== Helpers de sesión =====
describe('session helpers', () => {
  // Antes de cada test limpiamos localStorage para partir de un estado predecible
  beforeEach(() => {
    localStorage.clear();
  });

  describe('markSessionStart', () => {
    // Verifica que la primera llamada guarda el timestamp actual bajo la clave de sesión.
    // Comprobamos que el valor guardado esté entre el "antes" y el "después" de la llamada.
    it('stores the current timestamp when no session start exists', () => {
      const before = Date.now();
      markSessionStart();
      const stored = Number(localStorage.getItem(SESSION_STARTED_KEY));
      expect(stored).toBeGreaterThanOrEqual(before);
      expect(stored).toBeLessThanOrEqual(Date.now());
    });

    // Verifica que si ya existe un inicio de sesión, no se sobrescribe (idempotencia).
    it('does not overwrite an existing session start', () => {
      localStorage.setItem(SESSION_STARTED_KEY, '12345');
      markSessionStart();
      expect(localStorage.getItem(SESSION_STARTED_KEY)).toBe('12345');
    });
  });

  describe('isSessionExpired', () => {
    // Sin ningún valor guardado, la sesión no se considera expirada.
    it('returns false when no session start is stored', () => {
      expect(isSessionExpired()).toBe(false);
    });

    // Si el inicio fue hace menos de 2 días, la sesión sigue activa.
    it('returns false when the session is still fresh', () => {
      localStorage.setItem(SESSION_STARTED_KEY, String(Date.now() - 1000));
      expect(isSessionExpired()).toBe(false);
    });

    // Si el inicio fue hace más de 2 días, la sesión se considera expirada.
    // Guardamos un valor 1s por encima del límite para asegurar que supera TWO_DAYS_MS.
    it('returns true when the session is older than two days', () => {
      localStorage.setItem(SESSION_STARTED_KEY, String(Date.now() - TWO_DAYS_MS - 1000));
      expect(isSessionExpired()).toBe(true);
    });
  });

  describe('clearSessionStart', () => {
    // Al llamar a clearSessionStart se borra la clave de sesión de localStorage.
    it('removes the stored session start', () => {
      localStorage.setItem(SESSION_STARTED_KEY, '12345');
      clearSessionStart();
      expect(localStorage.getItem(SESSION_STARTED_KEY)).toBeNull();
    });
  });
});

// ===== Helpers de datos demo (modo preview sin Supabase) =====
describe('demo data helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getInitialDemoUser', () => {
    // La primera llamada crea el usuario demo por defecto, lo persiste en localStorage
    // y devuelve exactamente ese usuario.
    it('creates and persists a default demo user on first call', () => {
      const user = getInitialDemoUser();
      expect(user.id).toBe('user-demo-1111-2222-333344445555');
      expect(user.email).toBe('demouser@empresa.com');
      expect(JSON.parse(localStorage.getItem('demo_tracker_user'))).toEqual(user);
    });

    // Si el usuario demo ya existe en localStorage, las llamadas siguientes
    // devuelven el mismo valor (no se recrea).
    it('returns the stored user on subsequent calls', () => {
      const first = getInitialDemoUser();
      const second = getInitialDemoUser();
      expect(second).toEqual(first);
    });
  });

  describe('getDemoProjects', () => {
    // Verifica que la primera llamada siembra los 2 proyectos demo por defecto,
    // los persiste en localStorage y mantiene sus campos clave (uuid_proyecto).
    it('seeds default projects and stores them', () => {
      const projects = getDemoProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0]).toHaveProperty('uuid_proyecto', 'p-101-demo-uuid');
      expect(JSON.parse(localStorage.getItem('demo_tracker_projects'))).toEqual(projects);
    });

    // Si ya hay proyectos guardados, se devuelven esos en lugar de resembrar los demo.
    it('returns the stored projects instead of reseeding', () => {
      saveDemoProjects([{ uuid_proyecto: 'custom' }]);
      expect(getDemoProjects()).toEqual([{ uuid_proyecto: 'custom' }]);
    });
  });

  describe('getDemoActivities', () => {
    // Verifica que se siembran las 5 actividades demo por defecto, con un id_actividad
    // válido (> 0) y fechas de inicio/fin en formato string (YYYY-MM-DD).
    it('seeds five activities with date strings and stores them', () => {
      const activities = getDemoActivities();
      expect(activities).toHaveLength(5);
      for (const act of activities) {
        expect(act.id_actividad).toBeGreaterThan(0);
        expect(typeof act.inicio_actividad).toBe('string');
        expect(typeof act.fin_actividad).toBe('string');
      }
    });

    // Si ya hay actividades guardadas, se devuelven esas en lugar de resembrar las demo.
    it('returns stored activities instead of reseeding', () => {
      saveDemoActivities([{ id: 'act-custom' }]);
      expect(getDemoActivities()).toEqual([{ id: 'act-custom' }]);
    });
  });

  describe('saveDemoProjects / saveDemoActivities', () => {
    // Verifica que ambas funciones de guardado persisten el JSON exacto en localStorage.
    it('persist the given data to localStorage', () => {
      const projects = [{ uuid_proyecto: 'p' }];
      const activities = [{ id: 'a' }];
      saveDemoProjects(projects);
      saveDemoActivities(activities);
      expect(localStorage.getItem('demo_tracker_projects')).toBe(JSON.stringify(projects));
      expect(localStorage.getItem('demo_tracker_activities')).toBe(JSON.stringify(activities));
    });
  });
});

// ===== Comportamiento en entorno SSR/servidor (sin window) =====
describe('when window is unavailable (SSR/server)', () => {
  // Guardamos la referencia original para restaurarla después de cada test
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  // Sin window, todos los helpers deben devolver valores seguros (null, [], false)
  // y no lanzar errores, porque no hay localStorage disponible en el servidor.
  it('returns safe defaults without touching localStorage', () => {
    delete globalThis.window;
    expect(isSessionExpired()).toBe(false);
    expect(getInitialDemoUser()).toBeNull();
    expect(getDemoProjects()).toEqual([]);
    expect(getDemoActivities()).toEqual([]);
    expect(() => markSessionStart()).not.toThrow();
    expect(() => clearSessionStart()).not.toThrow();
  });
});