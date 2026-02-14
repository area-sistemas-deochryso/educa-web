// #region Implementation
/**
 * ConfiguraciÃ³n de eventos del calendario
 * Los dÃ­as con eventos se mostrarÃ¡n con el nÃºmero en verde
 */

export interface CalendarEvent {
	date: string; // Formato 'YYYY-MM-DD' (fecha de inicio)
	endDate?: string; // Formato 'YYYY-MM-DD' (fecha de fin, opcional para rangos)
	title: string;
	description: string;
	type: 'academic' | 'cultural' | 'sports' | 'meeting' | 'other';
	icon: string; // PrimeIcons class
	time?: string; // Hora del evento (opcional)
	location?: string; // Lugar del evento (opcional)
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
	// PerÃ­odo de matrÃ­cula
	{
		date: '2026-01-02',
		endDate: '2026-01-15',
		title: 'MatrÃ­cula Anticipada',
		description:
			'PerÃ­odo de matrÃ­cula anticipada con descuento especial. VÃ¡lido del 2 al 15 de enero.',
		type: 'academic',
		icon: 'pi-calendar-plus',
		time: '8:00 AM - 5:00 PM',
		location: 'SecretarÃ­a',
	},
	{
		date: '2026-01-16',
		endDate: '2026-01-31',
		title: 'MatrÃ­cula Regular',
		description: 'PerÃ­odo de matrÃ­cula regular. Asegura tu cupo para el aÃ±o escolar 2026.',
		type: 'academic',
		icon: 'pi-calendar',
		time: '8:00 AM - 5:00 PM',
		location: 'SecretarÃ­a',
	},
	{
		date: '2026-02-01',
		endDate: '2026-02-15',
		title: 'MatrÃ­cula ExtemporÃ¡nea',
		description: 'Ãšltimo perÃ­odo para matricularse. Se aplica recargo por matrÃ­cula tardÃ­a.',
		type: 'academic',
		icon: 'pi-exclamation-triangle',
		time: '8:00 AM - 5:00 PM',
		location: 'SecretarÃ­a',
	},
	{
		date: '2026-03-01',
		title: 'Inicio de clases',
		description:
			'Primer dÃ­a del aÃ±o escolar 2026. Bienvenida a todos los estudiantes y apertura oficial de las actividades acadÃ©micas.',
		type: 'academic',
		icon: 'pi-book',
		time: '8:00 AM',
		location: 'Todas las aulas',
	},
	{
		date: '2026-03-08',
		title: 'DÃ­a Internacional de la Mujer',
		description:
			'Celebramos a todas las mujeres que hacen posible la educaciÃ³n. Actividades conmemorativas.',
		type: 'cultural',
		icon: 'pi-heart',
		time: '10:00 AM',
		location: 'Auditorio',
	},
	{
		date: '2026-03-15',
		title: 'ReuniÃ³n de padres',
		description:
			'Primera reuniÃ³n general de padres de familia. Se presentarÃ¡ el plan curricular y las normas del aÃ±o escolar.',
		type: 'meeting',
		icon: 'pi-users',
		time: '6:00 PM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-04-20',
		title: 'DÃ­a del libro',
		description:
			'CelebraciÃ³n del DÃ­a Mundial del Libro. Actividades de lectura, intercambio de libros y presentaciones literarias.',
		type: 'cultural',
		icon: 'pi-book',
		time: '10:00 AM',
		location: 'Biblioteca',
	},
	{
		date: '2026-05-10',
		title: 'DÃ­a de la Madre',
		description: 'CelebraciÃ³n especial para todas las mamÃ¡s. Actuaciones y homenajes.',
		type: 'cultural',
		icon: 'pi-heart',
		time: '10:00 AM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-05-15',
		endDate: '2026-05-22',
		title: 'ExÃ¡menes parciales',
		description:
			'PerÃ­odo de evaluaciones parciales del primer bimestre. Revisar el cronograma de exÃ¡menes por grado.',
		type: 'academic',
		icon: 'pi-file-edit',
		time: '8:00 AM',
		location: 'Aulas asignadas',
	},
	{
		date: '2026-06-07',
		title: 'DÃ­a de la bandera',
		description:
			'Ceremonia cÃ­vica en honor al DÃ­a de la Bandera. Desfile escolar y actividades patriÃ³ticas.',
		type: 'cultural',
		icon: 'pi-flag',
		time: '9:00 AM',
		location: 'Patio principal',
	},
	{
		date: '2026-06-21',
		title: 'DÃ­a del Padre',
		description: 'CelebraciÃ³n especial para todos los papÃ¡s. Actuaciones y homenajes.',
		type: 'cultural',
		icon: 'pi-heart',
		time: '10:00 AM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-07-06',
		title: 'DÃ­a del maestro',
		description:
			'Homenaje a todos los docentes de la instituciÃ³n. Actuaciones especiales y reconocimientos.',
		type: 'cultural',
		icon: 'pi-heart',
		time: '10:00 AM',
		location: 'Auditorio',
	},
	{
		date: '2026-07-12',
		title: 'ReuniÃ³n de padres - Segundo Bimestre',
		description: 'ReuniÃ³n de padres de familia para revisar el avance del segundo bimestre.',
		type: 'meeting',
		icon: 'pi-users',
		time: '6:00 PM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-08-15',
		endDate: '2026-08-22',
		title: 'Olimpiadas deportivas',
		description:
			'Olimpiadas deportivas interescolares. Competencias de fÃºtbol, vÃ³ley, bÃ¡squet y atletismo.',
		type: 'sports',
		icon: 'pi-trophy',
		time: '8:00 AM',
		location: 'Campo deportivo',
	},
	{
		date: '2026-09-22',
		title: 'ReuniÃ³n de padres - Tercer Bimestre',
		description: 'ReuniÃ³n de padres de familia para revisar el avance del tercer bimestre.',
		type: 'meeting',
		icon: 'pi-users',
		time: '6:00 PM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-09-23',
		title: 'DÃ­a de la Primavera y del Estudiante',
		description:
			'CelebraciÃ³n del DÃ­a de la Primavera y la Juventud. Festival de mÃºsica, baile y elecciÃ³n de reinas.',
		type: 'cultural',
		icon: 'pi-sun',
		time: '10:00 AM',
		location: 'Patio central',
	},
	{
		date: '2026-10-31',
		title: 'Festival de disfraces',
		description:
			'Festival de Halloween con concurso de disfraces, decoraciÃ³n de aulas y actividades recreativas.',
		type: 'cultural',
		icon: 'pi-star',
		time: '9:00 AM',
		location: 'Todo el colegio',
	},
	{
		date: '2026-11-15',
		endDate: '2026-11-28',
		title: 'ExÃ¡menes finales',
		description:
			'PerÃ­odo de evaluaciones finales. Prepararse con anticipaciÃ³n revisando el material del aÃ±o.',
		type: 'academic',
		icon: 'pi-file-edit',
		time: '8:00 AM',
		location: 'Aulas asignadas',
	},
	{
		date: '2026-12-15',
		title: 'Clausura del aÃ±o escolar',
		description:
			'Ceremonia de clausura y entrega de libretas. PremiaciÃ³n a los mejores estudiantes del aÃ±o.',
		type: 'academic',
		icon: 'pi-graduation-cap',
		time: '10:00 AM',
		location: 'Auditorio principal',
	},
];

/**
 * Convierte una fecha a string formato 'YYYY-MM-DD'
 */
function dateToString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Obtiene el evento para una fecha especÃ­fica (inicio de evento)
 */
export function getEvent(date: Date): CalendarEvent | null {
	const dateString = dateToString(date);
	return CALENDAR_EVENTS.find((event) => event.date === dateString) || null;
}

/**
 * Verifica si una fecha estÃ¡ dentro de un rango de evento (entre inicio y fin, excluyendo inicio y fin)
 */
export function isDateInEventRange(date: Date): CalendarEvent | null {
	const dateString = dateToString(date);

	for (const event of CALENDAR_EVENTS) {
		if (event.endDate) {
			// Si la fecha es mayor que inicio y menor que fin (excluyendo inicio y fin)
			if (dateString > event.date && dateString < event.endDate) {
				return event;
			}
		}
	}
	return null;
}

/**
 * Verifica si una fecha es el fin de un rango de evento
 */
export function isDateEventEnd(date: Date): CalendarEvent | null {
	const dateString = dateToString(date);
	return CALENDAR_EVENTS.find((event) => event.endDate === dateString) || null;
}

/**
 * Obtiene todos los eventos para un aÃ±o especÃ­fico
 */
export function getEventsForYear(year: number): CalendarEvent[] {
	return CALENDAR_EVENTS.filter((event) => event.date.startsWith(`${year}-`));
}
// #endregion
