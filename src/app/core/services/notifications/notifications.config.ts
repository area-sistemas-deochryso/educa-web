/**
 * ConfiguraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n centralizada de notificaciones por temporada
 *
 * Para aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±adir una nueva notificaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n:
 * 1. AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±ade un objeto SeasonalNotification al array correspondiente
 * 2. Define las fechas de inicio y fin (o usa el helper para fechas recurrentes)
 * 3. El sistema verificarÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ automÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ticamente si debe mostrar la notificaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n
 */
// * Seasonal notification definitions + helpers.

export type NotificationType = 'matricula' | 'pago' | 'academico' | 'festividad' | 'evento';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SeasonalNotification {
	/** Identificador ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºnico */
	id: string;
	/** Tipo de notificaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n */
	type: NotificationType;
	/** TÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­tulo de la notificaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n */
	title: string;
	/** Mensaje/descripciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n */
	message: string;
	/** Icono (clase de PrimeIcons) */
	icon: string;
	/** Prioridad */
	priority: NotificationPriority;
	/** FunciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n que determina si debe mostrarse hoy */
	shouldShow: (date: Date) => boolean;
	/** URL de acciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n (opcional) */
	actionUrl?: string;
	/** Texto del botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de acciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n (opcional) */
	actionText?: string;
	/** Si se puede descartar */
	dismissible?: boolean;
}

// #region HELPERS PARA FECHAS

/**
 * Verifica si la fecha estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ dentro de un rango de dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­as del mes
 */
export function isWithinMonthDays(date: Date, startDay: number, endDay: number): boolean {
	const day = date.getDate();
	return day >= startDay && day <= endDay;
}

/**
 * Verifica si es un mes especÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­fico
 */
export function isMonth(date: Date, month: number): boolean {
	return date.getMonth() + 1 === month;
}

/**
 * Verifica si estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ dentro de un rango de fechas especÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ficas
 */
export function isWithinDateRange(
	date: Date,
	startMonth: number,
	startDay: number,
	endMonth: number,
	endDay: number,
): boolean {
	const month = date.getMonth() + 1;
	const day = date.getDate();

	if (startMonth === endMonth) {
		return month === startMonth && day >= startDay && day <= endDay;
	}

	if (month === startMonth) return day >= startDay;
	if (month === endMonth) return day <= endDay;
	return month > startMonth && month < endMonth;
}

/**
 * Verifica si es una fecha exacta (mes y dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a)
 */
export function isExactDate(date: Date, month: number, day: number): boolean {
	return date.getMonth() + 1 === month && date.getDate() === day;
}

/**
 * Verifica si estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ en los ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºltimos N dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­as del mes
 */
export function isLastDaysOfMonth(date: Date, days: number): boolean {
	const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	return date.getDate() > lastDay - days;
}

/**
 * Verifica si es fin de semana
 */
export function isWeekend(date: Date): boolean {
	const day = date.getDay();
	return day === 0 || day === 6;
}

// #endregion
// #region NOTIFICACIONES DE MATRÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂCULA (Inicio de aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o)

export const MATRICULA_NOTIFICATIONS: SeasonalNotification[] = [
	{
		id: 'matricula-anticipada',
		type: 'matricula',
		title: 'MatrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­cula Anticipada',
		message: 'Aprovecha el descuento por matrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­cula anticipada. ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Solo hasta el 15 de enero!',
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
		title: 'PerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo de MatrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­cula Regular',
		message: 'El perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo de matrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­cula regular estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ abierto. Asegura tu cupo para este aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o.',
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
		title: 'MatrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­cula ExtemporÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡nea',
		message: 'ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â¡ltimo perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo para matricularse. Se aplica recargo por matrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­cula tardÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a.',
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
		message: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Las clases comienzan maÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±ana! Revisa tu horario y prepara tus materiales.',
		icon: 'pi-book',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 3) && isWithinMonthDays(date, 1, 3),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver horario',
		dismissible: true,
	},
];

// #endregion
// #region NOTIFICACIONES DE PAGO (Fin de cada mes)

export const PAGO_NOTIFICATIONS: SeasonalNotification[] = [
	{
		id: 'pago-recordatorio',
		type: 'pago',
		title: 'Recordatorio de Pago',
		message: 'Tu cuota mensual vence en los prÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ximos dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­as. Evita recargos pagando a tiempo.',
		icon: 'pi-wallet',
		priority: 'medium',
		// ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â¡ltimos 7 dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­as de cada mes (excepto diciembre que tiene vacaciones)
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
		message: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Tu cuota vence maÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±ana! Realiza tu pago para evitar recargos y suspensiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n.',
		icon: 'pi-exclamation-circle',
		priority: 'urgent',
		// ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â¡ltimos 2 dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­as del mes
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
// #region NOTIFICACIONES ACADÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°MICAS (Resumen de promedios)

export const ACADEMICO_NOTIFICATIONS: SeasonalNotification[] = [
	{
		id: 'notas-primer-bimestre',
		type: 'academico',
		title: 'Notas del Primer Bimestre',
		message:
			'Ya estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡n disponibles las notas del primer bimestre. Revisa tu rendimiento acadÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©mico.',
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
		message: 'Ya estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡n disponibles las notas del segundo bimestre. ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Revisa tu progreso!',
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
		message: 'Ya estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡n disponibles las notas del tercer bimestre. Consulta tu rendimiento.',
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
		message: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Las notas finales del aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡n disponibles! Revisa tu promedio anual.',
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
		title: 'PerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo de RecuperaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n',
		message: 'El perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo de recuperaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ abierto. Consulta tus cursos pendientes.',
		icon: 'pi-refresh',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 23, 31),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver cursos',
		dismissible: true,
	},
];

// #endregion
// #region NOTIFICACIONES DE FESTIVIDADES Y EVENTOS

export const FESTIVIDAD_NOTIFICATIONS: SeasonalNotification[] = [
	// AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o Nuevo
	{
		id: 'feliz-aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o-nuevo',
		type: 'festividad',
		title: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Feliz AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o Nuevo! ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°',
		message: 'El equipo de EducaWeb te desea un excelente aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o lleno de logros acadÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©micos.',
		icon: 'pi-star-fill',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 1, 1),
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de la Mujer
	{
		id: 'dia-mujer',
		type: 'festividad',
		title: 'DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a Internacional de la Mujer',
		message: 'Celebramos a todas las mujeres que hacen posible la educaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n. ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Feliz dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a!',
		icon: 'pi-heart-fill',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 3, 8),
		dismissible: true,
	},
	// Semana Santa (aproximado - ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºltima semana de marzo o primera de abril)
	{
		id: 'semana-santa',
		type: 'festividad',
		title: 'Vacaciones de Semana Santa',
		message:
			'Disfruta de las vacaciones de Semana Santa. Las clases se reanudan el lunes siguiente.',
		icon: 'pi-sun',
		priority: 'medium',
		shouldShow: (date) => {
			// Semana Santa generalmente entre 20 marzo - 20 abril
			const month = date.getMonth() + 1;
			const day = date.getDate();
			return (
				(month === 3 && day >= 24 && day <= 31) || (month === 4 && day >= 1 && day <= 10)
			);
		},
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Trabajo
	{
		id: 'dia-trabajo',
		type: 'festividad',
		title: 'DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Trabajo',
		message: 'MaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±ana es feriado por el DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Trabajo. No hay clases.',
		icon: 'pi-briefcase',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 4, 30) || isExactDate(date, 5, 1),
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de la Madre
	{
		id: 'dia-madre',
		type: 'festividad',
		title: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Feliz DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de la Madre! ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â',
		message: 'Celebramos a todas las mamÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡s. ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Gracias por su dedicaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n!',
		icon: 'pi-heart-fill',
		priority: 'low',
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 8, 12), // Segundo domingo de mayo aprox
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Padre
	{
		id: 'dia-padre',
		type: 'festividad',
		title: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Feliz DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Padre! ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â',
		message: 'Celebramos a todos los papÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡s. ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Gracias por su apoyo!',
		icon: 'pi-heart-fill',
		priority: 'low',
		shouldShow: (date) => isMonth(date, 6) && isWithinMonthDays(date, 15, 19), // Tercer domingo de junio aprox
		dismissible: true,
	},
	// San Pedro y San Pablo
	{
		id: 'san-pedro-pablo',
		type: 'festividad',
		title: 'San Pedro y San Pablo',
		message: 'Feriado nacional. Festividad religiosa en honor a los apÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³stoles.',
		icon: 'pi-sun',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 6, 28) || isExactDate(date, 6, 29),
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de la Fuerza AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©rea del PerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âº
	{
		id: 'dia-fuerza-aerea',
		type: 'festividad',
		title: 'DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de la Fuerza AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©rea del PerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âº',
		message: 'Se conmemora la creaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de la Fuerza AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©rea del PerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âº.',
		icon: 'pi-send',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 7, 23),
		dismissible: true,
	},
	// Fiestas Patrias PerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âº
	{
		id: 'fiestas-patrias',
		type: 'festividad',
		title: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Felices Fiestas Patrias! ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡Ãƒâ€šÃ‚Âª',
		message: 'Celebremos juntos el aniversario de nuestra independencia. ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Viva el PerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âº!',
		icon: 'pi-flag-fill',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 7) && isWithinMonthDays(date, 27, 29),
		dismissible: true,
	},
	// Vacaciones de Medio AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o
	{
		id: 'vacaciones-julio',
		type: 'festividad',
		title: 'Vacaciones de Medio AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o',
		message: 'Disfruta tus vacaciones. Las clases se reanudan en agosto.',
		icon: 'pi-sun',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 7) && isWithinMonthDays(date, 24, 31),
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Maestro
	{
		id: 'dia-maestro',
		type: 'festividad',
		title: 'DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Maestro',
		message: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Felicitamos a todos los docentes en su dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a! Gracias por su dedicaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n.',
		icon: 'pi-users',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 7, 6),
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Maestro
	{
		id: 'dia-maestro',
		type: 'festividad',
		title: 'DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Maestro',
		message: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Felicitamos a todos los docentes en su dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a! Gracias por su dedicaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n.',
		icon: 'pi-users',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 7, 6),
		dismissible: true,
	},
	// Batalla de JunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­n
	{
		id: 'batalla-junin',
		type: 'festividad',
		title: 'Batalla de JunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­n',
		message: 'ConmemoraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de la victoria patriota en la Batalla de JunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­n (1824).',
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
		message: 'MaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±ana es feriado nacional. No hay clases.',
		icon: 'pi-heart',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 8, 29) || isExactDate(date, 8, 30),
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Estudiante
	{
		id: 'dia-estudiante',
		type: 'festividad',
		title: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Feliz DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Estudiante! ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€¦Ã‚Â¡',
		message: 'Celebramos a todos nuestros estudiantes. ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Sigan adelante con sus metas!',
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
		message: 'Feriado nacional. Recordamos a nuestros hÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©roes.',
		icon: 'pi-flag',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 10, 7) || isExactDate(date, 10, 8),
		dismissible: true,
	},
	// Halloween
	{
		id: 'halloween',
		type: 'festividad',
		title: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Feliz Halloween! ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½Ãƒâ€ Ã¢â‚¬â„¢',
		message: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Que disfrutes de un dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a espeluznantemente divertido!',
		icon: 'pi-moon',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 10, 31),
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de Todos los Santos
	{
		id: 'todos-santos',
		type: 'festividad',
		title: 'DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de Todos los Santos',
		message: 'Feriado nacional. Tiempo de reflexiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n y recuerdo.',
		icon: 'pi-heart',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 11, 1),
		dismissible: true,
	},
	// Inmaculada ConcepciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n
	{
		id: 'inmaculada-concepcion',
		type: 'festividad',
		title: 'Inmaculada ConcepciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n',
		message: 'Feriado nacional. Festividad catÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³lica de la Virgen MarÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a.',
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
		message:
			'ConmemoraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de la Batalla de Ayacucho (1824), victoria que sellÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ la independencia.',
		icon: 'pi-star',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 12, 9),
		dismissible: true,
	},
	// Navidad
	{
		id: 'navidad',
		type: 'festividad',
		title: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Feliz Navidad! ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾',
		message: 'El equipo de EducaWeb te desea una feliz Navidad junto a tus seres queridos.',
		icon: 'pi-gift',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 24, 25),
		dismissible: true,
	},
	// Vacaciones de Fin de AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o
	{
		id: 'vacaciones-diciembre',
		type: 'festividad',
		title: 'Vacaciones de Fin de AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o',
		message: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Disfruta tus vacaciones! Nos vemos el prÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ximo aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o con energÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­as renovadas.',
		icon: 'pi-sun',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 20, 31),
		dismissible: true,
	},
];

// #endregion
// #region NOTIFICACIONES DE EVENTOS ESCOLARES

export const EVENTO_NOTIFICATIONS: SeasonalNotification[] = [
	// Inicio de clases
	{
		id: 'inicio-clases-evento',
		type: 'evento',
		title: 'Inicio de Clases',
		message: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Comienza un nuevo aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o escolar! Bienvenidos a todos los estudiantes.',
		icon: 'pi-book',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 3) && isWithinMonthDays(date, 1, 3),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// ReuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de padres inicial
	{
		id: 'reunion-padres-inicial',
		type: 'evento',
		title: 'ReuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n General de Padres',
		message: 'Primera reuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n del aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o escolar. Se presentarÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ el plan curricular.',
		icon: 'pi-users',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 3) && isWithinMonthDays(date, 14, 16),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del libro
	{
		id: 'dia-libro',
		type: 'evento',
		title: 'DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a Mundial del Libro',
		message: 'CelebraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n del DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a del Libro. Actividades de lectura e intercambio.',
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
		title: 'ReuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de Padres - Primer Bimestre',
		message: 'PrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³xima reuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de padres de familia. Revisa la fecha en el calendario.',
		icon: 'pi-users',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 4) && isWithinMonthDays(date, 20, 25),
		actionUrl: '/intranet/calendario#today',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// ExÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡menes parciales
	{
		id: 'examenes-parciales',
		type: 'evento',
		title: 'PerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo de ExÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡menes Parciales',
		message: 'Inicio del perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo de evaluaciones parciales. Revisa el cronograma.',
		icon: 'pi-file-edit',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 13, 17),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver cronograma',
		dismissible: true,
	},
	// DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de la bandera
	{
		id: 'dia-bandera',
		type: 'evento',
		title: 'DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de la Bandera',
		message: 'Ceremonia cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­vica en honor al DÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a de la Bandera. Desfile escolar.',
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
		title: 'ReuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de Padres - Segundo Bimestre',
		message: 'PrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³xima reuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de padres de familia. Revisa la fecha en el calendario.',
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
		actionText: 'Ver programaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n',
		dismissible: true,
	},
	{
		id: 'reunion-padres-3',
		type: 'evento',
		title: 'ReuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de Padres - Tercer Bimestre',
		message: 'PrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³xima reuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de padres de familia. Revisa la fecha en el calendario.',
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
		message: 'ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡Celebremos juntos el aniversario de nuestra instituciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n!',
		icon: 'pi-star',
		priority: 'medium',
		// Ajustar la fecha segÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºn el aniversario real del colegio
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 15, 17),
		dismissible: true,
	},
	// ExÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡menes finales
	{
		id: 'examenes-finales',
		type: 'evento',
		title: 'PerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo de ExÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡menes Finales',
		message: 'Inicio del perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo de evaluaciones finales. Prepararse con anticipaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n.',
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
		message: 'Se acerca la ceremonia de clausura del aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o escolar. ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡No faltes!',
		icon: 'pi-star-fill',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 12, 18),
		actionUrl: '/intranet/calendario#today',
		actionText: 'Ver detalles',
		dismissible: true,
	},
];

// #endregion
// #region TODAS LAS NOTIFICACIONES COMBINADAS

export const ALL_NOTIFICATIONS: SeasonalNotification[] = [
	...MATRICULA_NOTIFICATIONS,
	...PAGO_NOTIFICATIONS,
	...ACADEMICO_NOTIFICATIONS,
	...FESTIVIDAD_NOTIFICATIONS,
	...EVENTO_NOTIFICATIONS,
];

/**
 * Obtiene las notificaciones que deben mostrarse hoy
 */
export function getTodayNotifications(date: Date = new Date()): SeasonalNotification[] {
	return ALL_NOTIFICATIONS.filter((notification) => notification.shouldShow(date));
}

/**
 * Obtiene notificaciones por tipo
 */
export function getNotificationsByType(type: NotificationType): SeasonalNotification[] {
	return ALL_NOTIFICATIONS.filter((n) => n.type === type);
}

/**
 * Obtiene notificaciones por prioridad
 */
export function getNotificationsByPriority(priority: NotificationPriority): SeasonalNotification[] {
	return ALL_NOTIFICATIONS.filter((n) => n.priority === priority);
}
// #endregion
