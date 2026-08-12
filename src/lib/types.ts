export interface Proyecto {
  uuid_proyecto: string;
  nombre_proyecto: string;
  descripcion_proyecto?: string;
  componentes: number; // Max 10
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
  uuid_usuario_dueno: string;
  uuids_usuarios_autorizados: string[];
  created_at?: string;
}

export interface UserSession {
  id: string;
  email: string;
}
