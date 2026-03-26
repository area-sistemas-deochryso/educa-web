/**
 * Centralized seasonal notification configuration.
 *
 * To add a new notification:
 * 1. Add a SeasonalNotification object to the proper array
 * 2. Define start and end dates (or use helper functions)
 * 3. The system will decide when to show the notification
 */

import type { SeasonalNotification, NotificationType, NotificationPriority } from './notifications.types';
import { isWithinMonthDays, isMonth, isExactDate, isLastDaysOfMonth } from './notifications-date.utils';

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
// #region FESTIVIDAD AND EVENT NOTIFICATIONS

export const FESTIVIDAD_NOTIFICATIONS: SeasonalNotification[] = [
	// Ano Nuevo
	{
		id: 'feliz-ano-nuevo',
		type: 'festividad',
		title: 'Feliz Ano Nuevo',
		message: 'El equipo de EducaWeb te desea un excelente ano lleno de logros academicos.',
		icon: 'pi-star-fill',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 1, 1),
		dismissible: true,
	},
	// Dia de la Mujer
	{
		id: 'dia-mujer',
		type: 'festividad',
		title: 'Dia Internacional de la Mujer',
		message: 'Celebramos a todas las mujeres que hacen posible la educacion. Feliz dia.',
		icon: 'pi-heart-fill',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 3, 8),
		dismissible: true,
	},
	// Semana Santa (approx)
	{
		id: 'semana-santa',
		type: 'festividad',
		title: 'Vacaciones de Semana Santa',
		message: 'Disfruta de las vacaciones de Semana Santa. Las clases se reanudan el lunes siguiente.',
		icon: 'pi-sun',
		priority: 'medium',
		shouldShow: (date) => {
			// Between late March and early April.
			const month = date.getMonth() + 1;
			const day = date.getDate();
			return (
				(month === 3 && day >= 24 && day <= 31) || (month === 4 && day >= 1 && day <= 10)
			);
		},
		dismissible: true,
	},
	// Dia del Trabajo
	{
		id: 'dia-trabajo',
		type: 'festividad',
		title: 'Dia del Trabajo',
		message: 'Manana es feriado por el Dia del Trabajo. No hay clases.',
		icon: 'pi-briefcase',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 4, 30) || isExactDate(date, 5, 1),
		dismissible: true,
	},
	// Dia de la Madre
	{
		id: 'dia-madre',
		type: 'festividad',
		title: 'Feliz Dia de la Madre',
		message: 'Celebramos a todas las mamas. Gracias por su dedicacion.',
		icon: 'pi-heart-fill',
		priority: 'low',
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 8, 12),
		dismissible: true,
	},
	// Dia del Padre
	{
		id: 'dia-padre',
		type: 'festividad',
		title: 'Feliz Dia del Padre',
		message: 'Celebramos a todos los papas. Gracias por su apoyo.',
		icon: 'pi-heart-fill',
		priority: 'low',
		shouldShow: (date) => isMonth(date, 6) && isWithinMonthDays(date, 15, 19),
		dismissible: true,
	},
	// San Pedro y San Pablo
	{
		id: 'san-pedro-pablo',
		type: 'festividad',
		title: 'San Pedro y San Pablo',
		message: 'Feriado nacional. Festividad religiosa en honor a los apostoles.',
		icon: 'pi-sun',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 6, 28) || isExactDate(date, 6, 29),
		dismissible: true,
	},
	// Dia de la Fuerza Aerea del Peru
	{
		id: 'dia-fuerza-aerea',
		type: 'festividad',
		title: 'Dia de la Fuerza Aerea del Peru',
		message: 'Se conmemora la creacion de la Fuerza Aerea del Peru.',
		icon: 'pi-send',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 7, 23),
		dismissible: true,
	},
	// Fiestas Patrias Peru
	{
		id: 'fiestas-patrias',
		type: 'festividad',
		title: 'Felices Fiestas Patrias',
		message: 'Celebremos juntos el aniversario de nuestra independencia. Viva el Peru.',
		icon: 'pi-flag-fill',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 7) && isWithinMonthDays(date, 27, 29),
		dismissible: true,
	},
	// Vacaciones de Medio Ano
	{
		id: 'vacaciones-julio',
		type: 'festividad',
		title: 'Vacaciones de Medio Ano',
		message: 'Disfruta tus vacaciones. Las clases se reanudan en agosto.',
		icon: 'pi-sun',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 7) && isWithinMonthDays(date, 24, 31),
		dismissible: true,
	},
	// Dia del Maestro
	{
		id: 'dia-maestro',
		type: 'festividad',
		title: 'Dia del Maestro',
		message: 'Felicitamos a todos los docentes en su dia. Gracias por su dedicacion.',
		icon: 'pi-users',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 7, 6),
		dismissible: true,
	},
	// Dia del Maestro (duplicate kept)
	{
		id: 'dia-maestro',
		type: 'festividad',
		title: 'Dia del Maestro',
		message: 'Felicitamos a todos los docentes en su dia. Gracias por su dedicacion.',
		icon: 'pi-users',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 7, 6),
		dismissible: true,
	},
	// Batalla de Junin
	{
		id: 'batalla-junin',
		type: 'festividad',
		title: 'Batalla de Junin',
		message: 'Conmemoracion de la victoria patriota en la Batalla de Junin (1824).',
		icon: 'pi-star',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 8, 6),
		dismissible: true,
	},
	// Santa Rosa de Lima
	{
		id: 'santa-rosa',
		type: 'festividad',
		title: 'Feriado - Santa Rosa de Lima',
		message: 'Manana es feriado nacional. No hay clases.',
		icon: 'pi-heart',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 8, 29) || isExactDate(date, 8, 30),
		dismissible: true,
	},
	// Dia del Estudiante
	{
		id: 'dia-estudiante',
		type: 'festividad',
		title: 'Feliz Dia del Estudiante',
		message: 'Celebramos a todos nuestros estudiantes. Sigan adelante con sus metas.',
		icon: 'pi-star-fill',
		priority: 'medium',
		shouldShow: (date) => isExactDate(date, 9, 23),
		dismissible: true,
	},
	// Combate de Angamos
	{
		id: 'combate-angamos',
		type: 'festividad',
		title: 'Combate de Angamos',
		message: 'Feriado nacional. Recordamos a nuestros heroes.',
		icon: 'pi-flag',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 10, 7) || isExactDate(date, 10, 8),
		dismissible: true,
	},
	// Halloween
	{
		id: 'halloween',
		type: 'festividad',
		title: 'Feliz Halloween',
		message: 'Que disfrutes de un dia divertido.',
		icon: 'pi-moon',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 10, 31),
		dismissible: true,
	},
	// Dia de Todos los Santos
	{
		id: 'todos-santos',
		type: 'festividad',
		title: 'Dia de Todos los Santos',
		message: 'Feriado nacional. Tiempo de reflexion y recuerdo.',
		icon: 'pi-heart',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 11, 1),
		dismissible: true,
	},
	// Inmaculada Concepcion
	{
		id: 'inmaculada-concepcion',
		type: 'festividad',
		title: 'Inmaculada Concepcion',
		message: 'Feriado nacional. Festividad catolica de la Virgen Maria.',
		icon: 'pi-sun',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 12, 8),
		dismissible: true,
	},
	// Batalla de Ayacucho
	{
		id: 'batalla-ayacucho',
		type: 'festividad',
		title: 'Batalla de Ayacucho',
		message: 'Conmemoracion de la Batalla de Ayacucho (1824), victoria que sello la independencia.',
		icon: 'pi-star',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 12, 9),
		dismissible: true,
	},
	// Navidad
	{
		id: 'navidad',
		type: 'festividad',
		title: 'Feliz Navidad',
		message: 'El equipo de EducaWeb te desea una feliz Navidad junto a tus seres queridos.',
		icon: 'pi-gift',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 24, 25),
		dismissible: true,
	},
	// Vacaciones de Fin de Ano
	{
		id: 'vacaciones-diciembre',
		type: 'festividad',
		title: 'Vacaciones de Fin de Ano',
		message: 'Disfruta tus vacaciones. Nos vemos el proximo ano con energias renovadas.',
		icon: 'pi-sun',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 20, 31),
		dismissible: true,
	},
];

// #endregion
// #region EVENTO NOTIFICATIONS

export const EVENTO_NOTIFICATIONS: SeasonalNotification[] = [
	// Inicio de clases
	{
		id: 'inicio-clases-evento',
		type: 'evento',
		title: 'Inicio de Clases',
		message: 'Comienza un nuevo ano escolar. Bienvenidos a todos los estudiantes.',
		icon: 'pi-book',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 3) && isWithinMonthDays(date, 1, 3),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// Reunion de padres inicial
	{
		id: 'reunion-padres-inicial',
		type: 'evento',
		title: 'Reunion General de Padres',
		message: 'Primera reunion del ano escolar. Se presentara el plan curricular.',
		icon: 'pi-users',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 3) && isWithinMonthDays(date, 14, 16),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// Dia del libro
	{
		id: 'dia-libro',
		type: 'evento',
		title: 'Dia Mundial del Libro',
		message: 'Celebracion del Dia del Libro. Actividades de lectura e intercambio.',
		icon: 'pi-book',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 4) && isWithinMonthDays(date, 19, 23),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver actividades',
		dismissible: true,
	},
	{
		id: 'reunion-padres-1',
		type: 'evento',
		title: 'Reunion de Padres - Primer Bimestre',
		message: 'Proxima reunion de padres de familia. Revisa la fecha en el calendario.',
		icon: 'pi-users',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 4) && isWithinMonthDays(date, 20, 25),
		actionUrl: '/intranet/calendario#today',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// Examenes parciales
	{
		id: 'examenes-parciales',
		type: 'evento',
		title: 'Periodo de Examenes Parciales',
		message: 'Inicio del periodo de evaluaciones parciales. Revisa el cronograma.',
		icon: 'pi-file-edit',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 13, 17),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver cronograma',
		dismissible: true,
	},
	// Dia de la bandera
	{
		id: 'dia-bandera',
		type: 'evento',
		title: 'Dia de la Bandera',
		message: 'Ceremonia civica en honor al Dia de la Bandera. Desfile escolar.',
		icon: 'pi-flag',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 6) && isWithinMonthDays(date, 6, 7),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver detalles',
		dismissible: true,
	},
	{
		id: 'reunion-padres-2',
		type: 'evento',
		title: 'Reunion de Padres - Segundo Bimestre',
		message: 'Proxima reunion de padres de familia. Revisa la fecha en el calendario.',
		icon: 'pi-users',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 7) && isWithinMonthDays(date, 10, 15),
		actionUrl: '/intranet/calendario#today',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// Olimpiadas deportivas
	{
		id: 'olimpiadas-deportivas',
		type: 'evento',
		title: 'Olimpiadas Deportivas',
		message: 'Inicio de las olimpiadas deportivas interescolares.',
		icon: 'pi-trophy',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 8) && isWithinMonthDays(date, 14, 16),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver programacion',
		dismissible: true,
	},
	{
		id: 'reunion-padres-3',
		type: 'evento',
		title: 'Reunion de Padres - Tercer Bimestre',
		message: 'Proxima reunion de padres de familia. Revisa la fecha en el calendario.',
		icon: 'pi-users',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 9) && isWithinMonthDays(date, 20, 25),
		actionUrl: '/intranet/calendario#today',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	{
		id: 'aniversario-colegio',
		type: 'evento',
		title: 'Aniversario del Colegio',
		message: 'Celebremos juntos el aniversario de nuestra institucion.',
		icon: 'pi-star',
		priority: 'medium',
		// Adjust this date for the real anniversary.
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 15, 17),
		dismissible: true,
	},
	// Examenes finales
	{
		id: 'examenes-finales',
		type: 'evento',
		title: 'Periodo de Examenes Finales',
		message: 'Inicio del periodo de evaluaciones finales. Prepararse con anticipacion.',
		icon: 'pi-file-edit',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 11) && isWithinMonthDays(date, 13, 17),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver cronograma',
		dismissible: true,
	},
	{
		id: 'clausura',
		type: 'evento',
		title: 'Ceremonia de Clausura',
		message: 'Se acerca la ceremonia de clausura del ano escolar. No faltes.',
		icon: 'pi-star-fill',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 12, 18),
		actionUrl: '/intranet/calendario#today',
		actionText: 'Ver detalles',
		dismissible: true,
	},
];

// #endregion
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
