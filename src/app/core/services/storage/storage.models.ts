import { AuthUser } from '../auth/auth.models';

/**
 * Storage Models - Interfaces para los datos almacenados en localStorage
 */

/** Estado de los modales del schedule */
export interface ScheduleModalsState {
	schedule?: boolean;
	summary?: boolean;
	details?: { visible: boolean; course: string };
	grades?: { visible: boolean; course: string };
}

/** Datos de notificaciones con fecha */
export interface NotificationStorageData {
	ids: string[];
	date: string;
}

/** Mes y año seleccionado para asistencia */
export interface AttendanceMonthData {
	month: number;
	year: number;
}

/** Datos de permisos del usuario */
export interface PermisosStorageData {
	usuarioId: number;
	rol: string;
	vistasPermitidas: string[];
	tienePermisosPersonalizados: boolean;
}

/** Re-exportar AuthUser para conveniencia */
export type { AuthUser };
