// #region Imports
import { AuthUser } from '../auth/auth.models';

/**
 * Storage Models - Interfaces para los datos almacenados en localStorage
 */
// * Local storage data shapes.

/** Estado de los modales del schedule */
// #endregion
// #region Implementation
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
	/** JWT con exp de 4h que indica cuándo vencen estos permisos */
	permisosToken?: string;
}

/** Re-exportar AuthUser para conveniencia */
export type { AuthUser };
// #endregion
