/**
 * Modelo de fecha formateada para la UI
 */
export interface FormattedDate {
	date: Date;
	iso: string;
	short: string; // 22/01/2026
	long: string; // 22 de enero de 2026
	relative: string; // hace 2 días, mañana, etc.
	dayName: string; // Miércoles
	monthName: string; // Enero
	time: string; // 14:30
}
