export interface Proyecto {
  uuid_proyecto: string;
  nombre_proyecto: string;
  descripcion_proyecto?: string;
  componentes: number; // Max 10
  inicio_proyecto?: string | null; // YYYY-MM-DD; si falta se deduce de las actividades
  fin_proyecto?: string | null;
  festivos?: string[]; // fechas YYYY-MM-DD que no cuentan como días hábiles
  uuid_usuario_dueno: string;
  uuids_usuarios_autorizados: string[];
  created_at?: string;
}

export interface Actividad {
  id?: string;
  id_actividad: number; // 1..100 por proyecto
  uuid_proyecto: string;
  nombre_actividad: string;
  actividades_predecesoras: number[]; // e.g. [1, 2]
  actividades_dependientes: number[]; // e.g. [3, 4]
  inicio_actividad: string; // YYYY-MM-DD
  fin_actividad: string; // YYYY-MM-DD
  avance_real: number; // 0..100, % de avance real registrado manualmente
  traslapes?: Record<number, number>; // por id de predecesora: días que puede empezar antes de que ella termine
  historial_avance?: { fecha: string; avance: number }[]; // registros de avance real por fecha
  uuid_usuario_dueno: string;
  uuids_usuarios_autorizados: string[];
  created_at?: string;
}

export interface UserSession {
  id: string;
  email: string;
}
