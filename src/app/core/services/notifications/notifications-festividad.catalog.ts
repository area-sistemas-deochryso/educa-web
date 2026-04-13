import type { SeasonalNotification } from './notifications.types';
import { isWithinMonthDays, isMonth, isExactDate } from './notifications-date.utils';

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

