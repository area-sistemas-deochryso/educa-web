// #region Implementation
/**
 * Configuración de eventos del calendario.
 * Los eventos ahora se cargan desde la API (EventosCalendarioController).
 * Este archivo mantiene la interfaz CalendarEvent y las funciones de búsqueda
 * que ahora reciben el array de eventos como parámetro.
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
export function getEventFromList(date: Date, events: CalendarEvent[]): CalendarEvent | null {
	const dateString = dateToString(date);
	return events.find((event) => event.date === dateString) || null;
}

/**
 * Verifica si una fecha está dentro de un rango de evento (entre inicio y fin, excluyendo inicio y fin)
 */
export function isDateInEventRangeFromList(date: Date, events: CalendarEvent[]): CalendarEvent | null {
	const dateString = dateToString(date);

	for (const event of events) {
		if (event.endDate) {
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
export function isDateEventEndFromList(date: Date, events: CalendarEvent[]): CalendarEvent | null {
	const dateString = dateToString(date);
	return events.find((event) => event.endDate === dateString) || null;
}
// #endregion
