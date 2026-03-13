import { NotificationPriority } from './notifications.config';

// #region Snapshot interfaces

/** Minimal schedule snapshot for notification generation. */
export interface HorarioSnapshot {
	cursoNombre: string;
	diaSemana: number;
	horaInicio: string;
	horaFin: string;
	salonDescripcion: string;
}

/** Minimal activity snapshot (tareas, evaluaciones, exposiciones, etc.). */
export interface ActividadSnapshot {
	cursoNombre: string;
	titulo: string;
	tipo: string;
	fecha: string;
}

/** Minimal grade snapshot for detecting new grades. */
export interface CalificacionSnapshot {
	cursoNombre: string;
	evaluacionId: number;
	titulo: string;
	tipo: string;
	nota: number | null;
}
// #endregion

// #region IndexedDB record
export interface SmartDataRecord {
	/** Composite key: "{entityId}:{type}" */
	key: string;
	entityId: number;
	type: 'horarios' | 'actividades' | 'calificaciones';
	data: HorarioSnapshot[] | ActividadSnapshot[] | CalificacionSnapshot[];
	savedAt: number;
	weekStart: string;
}
// #endregion

// #region Generated notification
export interface SmartNotification {
	id: string;
	type: 'smart';
	title: string;
	message: string;
	icon: string;
	priority: NotificationPriority;
	actionUrl?: string;
	dismissible: boolean;
}
// #endregion
