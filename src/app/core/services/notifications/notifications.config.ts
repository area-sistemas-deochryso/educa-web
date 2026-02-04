/**
 * Configuración centralizada de notificaciones por temporada
 *
 * Para añadir una nueva notificación:
 * 1. Añade un objeto SeasonalNotification al array correspondiente
 * 2. Define las fechas de inicio y fin (o usa el helper para fechas recurrentes)
 * 3. El sistema verificará automáticamente si debe mostrar la notificación
 */
// * Seasonal notification definitions + helpers.

export type NotificationType = 'matricula' | 'pago' | 'academico' | 'festividad' | 'evento';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SeasonalNotification {
	/** Identificador único */
	id: string;
	/** Tipo de notificación */
	type: NotificationType;
	/** Título de la notificación */
	title: string;
	/** Mensaje/descripción */
	message: string;
	/** Icono (clase de PrimeIcons) */
	icon: string;
	/** Prioridad */
	priority: NotificationPriority;
	/** Función que determina si debe mostrarse hoy */
	shouldShow: (date: Date) => boolean;
	/** URL de acción (opcional) */
	actionUrl?: string;
	/** Texto del botón de acción (opcional) */
	actionText?: string;
	/** Si se puede descartar */
	dismissible?: boolean;
}

// =============================================================================
// HELPERS PARA FECHAS
// =============================================================================

/**
 * Verifica si la fecha está dentro de un rango de días del mes
 */
export function isWithinMonthDays(date: Date, startDay: number, endDay: number): boolean {
	const day = date.getDate();
	return day >= startDay && day <= endDay;
}

/**
 * Verifica si es un mes específico
 */
export function isMonth(date: Date, month: number): boolean {
	return date.getMonth() + 1 === month;
}

/**
 * Verifica si está dentro de un rango de fechas específicas
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
 * Verifica si es una fecha exacta (mes y día)
 */
export function isExactDate(date: Date, month: number, day: number): boolean {
	return date.getMonth() + 1 === month && date.getDate() === day;
}

/**
 * Verifica si está en los últimos N días del mes
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

// =============================================================================
// NOTIFICACIONES DE MATRÍCULA (Inicio de año)
// =============================================================================

export const MATRICULA_NOTIFICATIONS: SeasonalNotification[] = [
	{
		id: 'matricula-anticipada',
		type: 'matricula',
		title: 'Matrícula Anticipada',
		message: 'Aprovecha el descuento por matrícula anticipada. ¡Solo hasta el 15 de enero!',
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
		title: 'Período de Matrícula Regular',
		message: 'El período de matrícula regular está abierto. Asegura tu cupo para este año.',
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
		title: 'Matrícula Extemporánea',
		message: 'Último período para matricularse. Se aplica recargo por matrícula tardía.',
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
		message: '¡Las clases comienzan mañana! Revisa tu horario y prepara tus materiales.',
		icon: 'pi-book',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 3) && isWithinMonthDays(date, 1, 3),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver horario',
		dismissible: true,
	},
];

// =============================================================================
// NOTIFICACIONES DE PAGO (Fin de cada mes)
// =============================================================================

export const PAGO_NOTIFICATIONS: SeasonalNotification[] = [
	{
		id: 'pago-recordatorio',
		type: 'pago',
		title: 'Recordatorio de Pago',
		message: 'Tu cuota mensual vence en los próximos días. Evita recargos pagando a tiempo.',
		icon: 'pi-wallet',
		priority: 'medium',
		// Últimos 7 días de cada mes (excepto diciembre que tiene vacaciones)
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
		message: '¡Tu cuota vence mañana! Realiza tu pago para evitar recargos y suspensión.',
		icon: 'pi-exclamation-circle',
		priority: 'urgent',
		// Últimos 2 días del mes
		shouldShow: (date) => {
			const month = date.getMonth() + 1;
			return month !== 12 && month !== 1 && month !== 2 && isLastDaysOfMonth(date, 2);
		},
		actionUrl: '/intranet/pagos',
		actionText: 'Pagar ahora',
		dismissible: false,
	},
];

// =============================================================================
// NOTIFICACIONES ACADÉMICAS (Resumen de promedios)
// =============================================================================

export const ACADEMICO_NOTIFICATIONS: SeasonalNotification[] = [
	{
		id: 'notas-primer-bimestre',
		type: 'academico',
		title: 'Notas del Primer Bimestre',
		message:
			'Ya están disponibles las notas del primer bimestre. Revisa tu rendimiento académico.',
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
		message: 'Ya están disponibles las notas del segundo bimestre. ¡Revisa tu progreso!',
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
		message: 'Ya están disponibles las notas del tercer bimestre. Consulta tu rendimiento.',
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
		message: '¡Las notas finales del año están disponibles! Revisa tu promedio anual.',
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
		title: 'Período de Recuperación',
		message: 'El período de recuperación está abierto. Consulta tus cursos pendientes.',
		icon: 'pi-refresh',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 23, 31),
		actionUrl: '/intranet/horarios',
		actionText: 'Ver cursos',
		dismissible: true,
	},
];

// =============================================================================
// NOTIFICACIONES DE FESTIVIDADES Y EVENTOS
// =============================================================================

export const FESTIVIDAD_NOTIFICATIONS: SeasonalNotification[] = [
	// Año Nuevo
	{
		id: 'feliz-año-nuevo',
		type: 'festividad',
		title: '¡Feliz Año Nuevo! 🎉',
		message: 'El equipo de EducaWeb te desea un excelente año lleno de logros académicos.',
		icon: 'pi-star-fill',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 1, 1),
		dismissible: true,
	},
	// Día de la Mujer
	{
		id: 'dia-mujer',
		type: 'festividad',
		title: 'Día Internacional de la Mujer',
		message: 'Celebramos a todas las mujeres que hacen posible la educación. ¡Feliz día!',
		icon: 'pi-heart-fill',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 3, 8),
		dismissible: true,
	},
	// Semana Santa (aproximado - última semana de marzo o primera de abril)
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
	// Día del Trabajo
	{
		id: 'dia-trabajo',
		type: 'festividad',
		title: 'Día del Trabajo',
		message: 'Mañana es feriado por el Día del Trabajo. No hay clases.',
		icon: 'pi-briefcase',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 4, 30) || isExactDate(date, 5, 1),
		dismissible: true,
	},
	// Día de la Madre
	{
		id: 'dia-madre',
		type: 'festividad',
		title: '¡Feliz Día de la Madre! 💐',
		message: 'Celebramos a todas las mamás. ¡Gracias por su dedicación!',
		icon: 'pi-heart-fill',
		priority: 'low',
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 8, 12), // Segundo domingo de mayo aprox
		dismissible: true,
	},
	// Día del Padre
	{
		id: 'dia-padre',
		type: 'festividad',
		title: '¡Feliz Día del Padre! 👔',
		message: 'Celebramos a todos los papás. ¡Gracias por su apoyo!',
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
		message: 'Feriado nacional. Festividad religiosa en honor a los apóstoles.',
		icon: 'pi-sun',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 6, 28) || isExactDate(date, 6, 29),
		dismissible: true,
	},
	// Día de la Fuerza Aérea del Perú
	{
		id: 'dia-fuerza-aerea',
		type: 'festividad',
		title: 'Día de la Fuerza Aérea del Perú',
		message: 'Se conmemora la creación de la Fuerza Aérea del Perú.',
		icon: 'pi-send',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 7, 23),
		dismissible: true,
	},
	// Fiestas Patrias Perú
	{
		id: 'fiestas-patrias',
		type: 'festividad',
		title: '¡Felices Fiestas Patrias! 🇵🇪',
		message: 'Celebremos juntos el aniversario de nuestra independencia. ¡Viva el Perú!',
		icon: 'pi-flag-fill',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 7) && isWithinMonthDays(date, 27, 29),
		dismissible: true,
	},
	// Vacaciones de Medio Año
	{
		id: 'vacaciones-julio',
		type: 'festividad',
		title: 'Vacaciones de Medio Año',
		message: 'Disfruta tus vacaciones. Las clases se reanudan en agosto.',
		icon: 'pi-sun',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 7) && isWithinMonthDays(date, 24, 31),
		dismissible: true,
	},
	// Día del Maestro
	{
		id: 'dia-maestro',
		type: 'festividad',
		title: 'Día del Maestro',
		message: '¡Felicitamos a todos los docentes en su día! Gracias por su dedicación.',
		icon: 'pi-users',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 7, 6),
		dismissible: true,
	},
	// Día del Maestro
	{
		id: 'dia-maestro',
		type: 'festividad',
		title: 'Día del Maestro',
		message: '¡Felicitamos a todos los docentes en su día! Gracias por su dedicación.',
		icon: 'pi-users',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 7, 6),
		dismissible: true,
	},
	// Batalla de Junín
	{
		id: 'batalla-junin',
		type: 'festividad',
		title: 'Batalla de Junín',
		message: 'Conmemoración de la victoria patriota en la Batalla de Junín (1824).',
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
		message: 'Mañana es feriado nacional. No hay clases.',
		icon: 'pi-heart',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 8, 29) || isExactDate(date, 8, 30),
		dismissible: true,
	},
	// Día del Estudiante
	{
		id: 'dia-estudiante',
		type: 'festividad',
		title: '¡Feliz Día del Estudiante! 📚',
		message: 'Celebramos a todos nuestros estudiantes. ¡Sigan adelante con sus metas!',
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
		message: 'Feriado nacional. Recordamos a nuestros héroes.',
		icon: 'pi-flag',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 10, 7) || isExactDate(date, 10, 8),
		dismissible: true,
	},
	// Halloween
	{
		id: 'halloween',
		type: 'festividad',
		title: '¡Feliz Halloween! 🎃',
		message: '¡Que disfrutes de un día espeluznantemente divertido!',
		icon: 'pi-moon',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 10, 31),
		dismissible: true,
	},
	// Día de Todos los Santos
	{
		id: 'todos-santos',
		type: 'festividad',
		title: 'Día de Todos los Santos',
		message: 'Feriado nacional. Tiempo de reflexión y recuerdo.',
		icon: 'pi-heart',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 11, 1),
		dismissible: true,
	},
	// Inmaculada Concepción
	{
		id: 'inmaculada-concepcion',
		type: 'festividad',
		title: 'Inmaculada Concepción',
		message: 'Feriado nacional. Festividad católica de la Virgen María.',
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
			'Conmemoración de la Batalla de Ayacucho (1824), victoria que selló la independencia.',
		icon: 'pi-star',
		priority: 'low',
		shouldShow: (date) => isExactDate(date, 12, 9),
		dismissible: true,
	},
	// Navidad
	{
		id: 'navidad',
		type: 'festividad',
		title: '¡Feliz Navidad! 🎄',
		message: 'El equipo de EducaWeb te desea una feliz Navidad junto a tus seres queridos.',
		icon: 'pi-gift',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 24, 25),
		dismissible: true,
	},
	// Vacaciones de Fin de Año
	{
		id: 'vacaciones-diciembre',
		type: 'festividad',
		title: 'Vacaciones de Fin de Año',
		message: '¡Disfruta tus vacaciones! Nos vemos el próximo año con energías renovadas.',
		icon: 'pi-sun',
		priority: 'medium',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 20, 31),
		dismissible: true,
	},
];

// =============================================================================
// NOTIFICACIONES DE EVENTOS ESCOLARES
// =============================================================================

export const EVENTO_NOTIFICATIONS: SeasonalNotification[] = [
	// Inicio de clases
	{
		id: 'inicio-clases-evento',
		type: 'evento',
		title: 'Inicio de Clases',
		message: '¡Comienza un nuevo año escolar! Bienvenidos a todos los estudiantes.',
		icon: 'pi-book',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 3) && isWithinMonthDays(date, 1, 3),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// Reunión de padres inicial
	{
		id: 'reunion-padres-inicial',
		type: 'evento',
		title: 'Reunión General de Padres',
		message: 'Primera reunión del año escolar. Se presentará el plan curricular.',
		icon: 'pi-users',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 3) && isWithinMonthDays(date, 14, 16),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// Día del libro
	{
		id: 'dia-libro',
		type: 'evento',
		title: 'Día Mundial del Libro',
		message: 'Celebración del Día del Libro. Actividades de lectura e intercambio.',
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
		title: 'Reunión de Padres - Primer Bimestre',
		message: 'Próxima reunión de padres de familia. Revisa la fecha en el calendario.',
		icon: 'pi-users',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 4) && isWithinMonthDays(date, 20, 25),
		actionUrl: '/intranet/calendario#today',
		actionText: 'Ver calendario',
		dismissible: true,
	},
	// Exámenes parciales
	{
		id: 'examenes-parciales',
		type: 'evento',
		title: 'Período de Exámenes Parciales',
		message: 'Inicio del período de evaluaciones parciales. Revisa el cronograma.',
		icon: 'pi-file-edit',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 13, 17),
		actionUrl: '/intranet/calendario',
		actionText: 'Ver cronograma',
		dismissible: true,
	},
	// Día de la bandera
	{
		id: 'dia-bandera',
		type: 'evento',
		title: 'Día de la Bandera',
		message: 'Ceremonia cívica en honor al Día de la Bandera. Desfile escolar.',
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
		title: 'Reunión de Padres - Segundo Bimestre',
		message: 'Próxima reunión de padres de familia. Revisa la fecha en el calendario.',
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
		actionText: 'Ver programación',
		dismissible: true,
	},
	{
		id: 'reunion-padres-3',
		type: 'evento',
		title: 'Reunión de Padres - Tercer Bimestre',
		message: 'Próxima reunión de padres de familia. Revisa la fecha en el calendario.',
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
		message: '¡Celebremos juntos el aniversario de nuestra institución!',
		icon: 'pi-star',
		priority: 'medium',
		// Ajustar la fecha según el aniversario real del colegio
		shouldShow: (date) => isMonth(date, 5) && isWithinMonthDays(date, 15, 17),
		dismissible: true,
	},
	// Exámenes finales
	{
		id: 'examenes-finales',
		type: 'evento',
		title: 'Período de Exámenes Finales',
		message: 'Inicio del período de evaluaciones finales. Prepararse con anticipación.',
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
		message: 'Se acerca la ceremonia de clausura del año escolar. ¡No faltes!',
		icon: 'pi-star-fill',
		priority: 'high',
		shouldShow: (date) => isMonth(date, 12) && isWithinMonthDays(date, 12, 18),
		actionUrl: '/intranet/calendario#today',
		actionText: 'Ver detalles',
		dismissible: true,
	},
];

// =============================================================================
// TODAS LAS NOTIFICACIONES COMBINADAS
// =============================================================================

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
