/**
 * Configuración de eventos del calendario
 * Los días con eventos se mostrarán con el número en verde
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
	// Período de matrícula
	{
		date: '2026-01-02',
		endDate: '2026-01-15',
		title: 'Matrícula Anticipada',
		description: 'Período de matrícula anticipada con descuento especial. Válido del 2 al 15 de enero.',
		type: 'academic',
		icon: 'pi-calendar-plus',
		time: '8:00 AM - 5:00 PM',
		location: 'Secretaría',
	},
	{
		date: '2026-01-16',
		endDate: '2026-01-31',
		title: 'Matrícula Regular',
		description: 'Período de matrícula regular. Asegura tu cupo para el año escolar 2026.',
		type: 'academic',
		icon: 'pi-calendar',
		time: '8:00 AM - 5:00 PM',
		location: 'Secretaría',
	},
	{
		date: '2026-02-01',
		endDate: '2026-02-15',
		title: 'Matrícula Extemporánea',
		description: 'Último período para matricularse. Se aplica recargo por matrícula tardía.',
		type: 'academic',
		icon: 'pi-exclamation-triangle',
		time: '8:00 AM - 5:00 PM',
		location: 'Secretaría',
	},
	{
		date: '2026-03-01',
		title: 'Inicio de clases',
		description: 'Primer día del año escolar 2026. Bienvenida a todos los estudiantes y apertura oficial de las actividades académicas.',
		type: 'academic',
		icon: 'pi-book',
		time: '8:00 AM',
		location: 'Todas las aulas',
	},
	{
		date: '2026-03-08',
		title: 'Día Internacional de la Mujer',
		description: 'Celebramos a todas las mujeres que hacen posible la educación. Actividades conmemorativas.',
		type: 'cultural',
		icon: 'pi-heart',
		time: '10:00 AM',
		location: 'Auditorio',
	},
	{
		date: '2026-03-15',
		title: 'Reunión de padres',
		description: 'Primera reunión general de padres de familia. Se presentará el plan curricular y las normas del año escolar.',
		type: 'meeting',
		icon: 'pi-users',
		time: '6:00 PM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-04-20',
		title: 'Día del libro',
		description: 'Celebración del Día Mundial del Libro. Actividades de lectura, intercambio de libros y presentaciones literarias.',
		type: 'cultural',
		icon: 'pi-book',
		time: '10:00 AM',
		location: 'Biblioteca',
	},
	{
		date: '2026-05-10',
		title: 'Día de la Madre',
		description: 'Celebración especial para todas las mamás. Actuaciones y homenajes.',
		type: 'cultural',
		icon: 'pi-heart',
		time: '10:00 AM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-05-15',
		endDate: '2026-05-22',
		title: 'Exámenes parciales',
		description: 'Período de evaluaciones parciales del primer bimestre. Revisar el cronograma de exámenes por grado.',
		type: 'academic',
		icon: 'pi-file-edit',
		time: '8:00 AM',
		location: 'Aulas asignadas',
	},
	{
		date: '2026-06-07',
		title: 'Día de la bandera',
		description: 'Ceremonia cívica en honor al Día de la Bandera. Desfile escolar y actividades patrióticas.',
		type: 'cultural',
		icon: 'pi-flag',
		time: '9:00 AM',
		location: 'Patio principal',
	},
	{
		date: '2026-06-21',
		title: 'Día del Padre',
		description: 'Celebración especial para todos los papás. Actuaciones y homenajes.',
		type: 'cultural',
		icon: 'pi-heart',
		time: '10:00 AM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-07-06',
		title: 'Día del maestro',
		description: 'Homenaje a todos los docentes de la institución. Actuaciones especiales y reconocimientos.',
		type: 'cultural',
		icon: 'pi-heart',
		time: '10:00 AM',
		location: 'Auditorio',
	},
	{
		date: '2026-07-12',
		title: 'Reunión de padres - Segundo Bimestre',
		description: 'Reunión de padres de familia para revisar el avance del segundo bimestre.',
		type: 'meeting',
		icon: 'pi-users',
		time: '6:00 PM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-08-15',
		endDate: '2026-08-22',
		title: 'Olimpiadas deportivas',
		description: 'Olimpiadas deportivas interescolares. Competencias de fútbol, vóley, básquet y atletismo.',
		type: 'sports',
		icon: 'pi-trophy',
		time: '8:00 AM',
		location: 'Campo deportivo',
	},
	{
		date: '2026-09-22',
		title: 'Reunión de padres - Tercer Bimestre',
		description: 'Reunión de padres de familia para revisar el avance del tercer bimestre.',
		type: 'meeting',
		icon: 'pi-users',
		time: '6:00 PM',
		location: 'Auditorio principal',
	},
	{
		date: '2026-09-23',
		title: 'Día de la Primavera y del Estudiante',
		description: 'Celebración del Día de la Primavera y la Juventud. Festival de música, baile y elección de reinas.',
		type: 'cultural',
		icon: 'pi-sun',
		time: '10:00 AM',
		location: 'Patio central',
	},
	{
		date: '2026-10-31',
		title: 'Festival de disfraces',
		description: 'Festival de Halloween con concurso de disfraces, decoración de aulas y actividades recreativas.',
		type: 'cultural',
		icon: 'pi-star',
		time: '9:00 AM',
		location: 'Todo el colegio',
	},
	{
		date: '2026-11-15',
		endDate: '2026-11-28',
		title: 'Exámenes finales',
		description: 'Período de evaluaciones finales. Prepararse con anticipación revisando el material del año.',
		type: 'academic',
		icon: 'pi-file-edit',
		time: '8:00 AM',
		location: 'Aulas asignadas',
	},
	{
		date: '2026-12-15',
		title: 'Clausura del año escolar',
		description: 'Ceremonia de clausura y entrega de libretas. Premiación a los mejores estudiantes del año.',
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
 * Obtiene el evento para una fecha específica (inicio de evento)
 */
export function getEvent(date: Date): CalendarEvent | null {
	const dateString = dateToString(date);
	return CALENDAR_EVENTS.find((event) => event.date === dateString) || null;
}

/**
 * Verifica si una fecha está dentro de un rango de evento (entre inicio y fin, excluyendo inicio y fin)
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
 * Obtiene todos los eventos para un año específico
 */
export function getEventsForYear(year: number): CalendarEvent[] {
	return CALENDAR_EVENTS.filter((event) => event.date.startsWith(`${year}-`));
}
