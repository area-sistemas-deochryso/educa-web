/**
 * Centralized seasonal notification configuration.
 *
 * To add a new notification:
 * 1. Add a SeasonalNotification object to the proper array
 * 2. Define start and end dates (or use helper functions)
 * 3. The system will decide when to show the notification
 */

import type { SeasonalNotification, NotificationType, NotificationPriority } from './notifications.types';
import { isWithinMonthDays, isMonth, isLastDaysOfMonth } from './notifications-date.utils';

// Re-export types and date utils so existing consumers keep working
export * from './notifications.types';
export * from './notifications-date.utils';

// #region MATRICULA NOTIFICATIONS (start of year)

export const MATRICULA_NOTIFICATIONS: SeasonalNotification[] = [
	{
		id: 'matricula-anticipada',
		type: 'matricula',
		title: 'Matricula Anticipada',
		message: 'Aprovecha el descuento por matricula anticipada. Solo hasta el 15 de enero.',
		icon: 'pi-calendar-plus',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 1) && isWithinMonthDays(date, 1, 15),
		actionUrl: '/intranet/matricula',
		actionText: 'Matricularme',
		dismissible: true,
	},
	{
		id: 'matricula-regular',
		type: 'matricula',
		title: 'Periodo de Matricula Regular',
		message: 'El periodo de matricula regular esta abierto. Asegura tu cupo para este ano.',
		icon: 'pi-calendar',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 1) && isWithinMonthDays(date, 16, 31),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver detalles',
		dismissible: true,
	},
	{
		id: 'matricula-extemporanea',
		type: 'matricula',
		title: 'Matricula Extemporanea',
		message: 'Ultimo periodo para matricularse. Se aplica recargo por matricula tardia.',
		icon: 'pi-exclamation-triangle',
		priority: 'urgent',
		shouldShow: (date) => isMonth(date, 2) && isWithinMonthDays(date, 1, 15),
		actionUrl: '/intranet/matricula',
		actionText: 'Matricularme ahora',
		dismissible: false,
	},
	{
		id: 'inicio-clases',
		type: 'matricula',
		title: 'Inicio de Clases',
		message: 'Las clases comienzan manana. Revisa tu horario y prepara tus materiales.',
		icon: 'pi-book',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 3) && isWithinMonthDays(date, 1, 3),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver horario',
		dismissible: true,
	},
];

// #endregion
// #region PAGO NOTIFICATIONS (end of month)

export const PAGO_NOTIFICATIONS: SeasonalNotification[] = [
	{
		id: 'pago-recordatorio',
		type: 'pago',
		title: 'Recordatorio de Pago',
		message: 'Tu cuota mensual vence en los proximos dias. Evita recargos pagando a tiempo.',
		icon: 'pi-wallet',
		priority: 'medium',
		// Last 7 days of each month (except Dec, Jan, Feb).
		shouldShow: (date) => {
			const month = date.getMonth() + 1;
			return month !== 12 && month !== 1 && month !== 2 && isLastDaysOfMonth(date, 7);
		},
		actionUrl: '/intranet/pagos',
		actionText: 'Pagar ahora',
		dismissible: true,
	},
	{
		id: 'pago-urgente',
		type: 'pago',
		title: 'Pago Pendiente',
		message: 'Tu cuota vence manana. Realiza tu pago para evitar recargos y suspension.',
		icon: 'pi-exclamation-circle',
		priority: 'urgent',
		// Last 2 days of the month.
		shouldShow: (date) => {
			const month = date.getMonth() + 1;
			return month !== 12 && month !== 1 && month !== 2 && isLastDaysOfMonth(date, 2);
		},
		actionUrl: '/intranet/pagos',
		actionText: 'Pagar ahora',
		dismissible: false,
	},
];

// #endregion
// #region ACADEMICO NOTIFICATIONS (grades summary)

export const ACADEMICO_NOTIFICATIONS: SeasonalNotification[] = [
	{
		id: 'notas-primer-bimestre',
		type: 'academico',
		title: 'Notas del Primer Bimestre',
		message: 'Ya estan disponibles las notas del primer bimestre. Revisa tu rendimiento academico.',
		icon: 'pi-chart-bar',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 1, 7),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver notas',
		dismissible: true,
	},
	{
		id: 'notas-segundo-bimestre',
		type: 'academico',
		title: 'Notas del Segundo Bimestre',
		message: 'Ya estan disponibles las notas del segundo bimestre. Revisa tu progreso.',
		icon: 'pi-chart-bar',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 7) && isWithinMonthDays(date, 15, 22),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver notas',
		dismissible: true,
	},
	{
		id: 'notas-tercer-bimestre',
		type: 'academico',
		title: 'Notas del Tercer Bimestre',
		message: 'Ya estan disponibles las notas del tercer bimestre. Consulta tu rendimiento.',
		icon: 'pi-chart-bar',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 10) && isWithinMonthDays(date, 1, 7),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver notas',
		dismissible: true,
	},
	{
		id: 'notas-cuarto-bimestre',
		type: 'academico',
		title: 'Notas Finales Disponibles',
		message: 'Las notas finales del ano estan disponibles. Revisa tu promedio anual.',
		icon: 'pi-star',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 15, 22),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver notas finales',
		dismissible: true,
	},
	{
		id: 'recuperacion-disponible',
		type: 'academico',
		title: 'Periodo de Recuperacion',
		message: 'El periodo de recuperacion esta abierto. Consulta tus cursos pendientes.',
		icon: 'pi-refresh',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 23, 31),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver cursos',
		dismissible: true,
	},
];

// #endregion

export { FESTIVIDAD_NOTIFICATIONS } from './notifications-festividad.catalog';
export { EVENTO_NOTIFICATIONS } from './notifications-evento.catalog';

import { FESTIVIDAD_NOTIFICATIONS } from './notifications-festividad.catalog';
import { EVENTO_NOTIFICATIONS } from './notifications-evento.catalog';

// #region ALL NOTIFICATIONS COMBINED

export const ALL_NOTIFICATIONS: SeasonalNotification[] = [
	...MATRICULA_NOTIFICATIONS,
	...PAGO_NOTIFICATIONS,
	...ACADEMICO_NOTIFICATIONS,
	...FESTIVIDAD_NOTIFICATIONS,
	...EVENTO_NOTIFICATIONS,
];

/**
 * Get notifications that should be shown today.
 */
export function getTodayNotifications(date: Date = new Date()): SeasonalNotification[] {
	return ALL_NOTIFICATIONS.filter((notification) => notification.shouldShow(date));
}

/**
 * Get notifications by type.
 */
export function getNotificationsByType(type: NotificationType): SeasonalNotification[] {
	return ALL_NOTIFICATIONS.filter((n) => n.type === type);
}

/**
 * Get notifications by priority.
 */
export function getNotificationsByPriority(priority: NotificationPriority): SeasonalNotification[] {
	return ALL_NOTIFICATIONS.filter((n) => n.priority === priority);
}

// #endregion
