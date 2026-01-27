import { AttendanceStatus, LegendItem, MonthOption } from './attendance.types';

export const ATTENDANCE_STORAGE_KEY = 'attendance_selected_month';

/**
 * Fecha de inicio del registro de asistencias.
 * Fechas anteriores a esta no se cuentan como falta.
 */
export const ATTENDANCE_START_DATE = new Date(2026, 0, 26); // 26 de enero de 2026

/**
 * Configuración de horas límite para determinar el estado de asistencia.
 * Las horas se expresan en formato 24h como { hour, minute }.
 */
export interface TimeLimit {
	hour: number;
	minute: number;
}

export interface AttendanceTimeConfig {
	temprano: TimeLimit; // Límite para considerar "temprano"
	aTiempo: TimeLimit; // Límite para considerar "a tiempo"
}

/**
 * Configuración de horas para INGRESOS (entrada) - Horario regular (marzo-diciembre):
 * - Temprano (T): antes de las 7:30
 * - A tiempo (A): entre 7:30 y 8:00
 * - Fuera de hora (F): después de las 8:00
 */
export const INGRESO_TIME_CONFIG: AttendanceTimeConfig = {
	temprano: { hour: 7, minute: 30 }, // Antes de 7:30 = Temprano
	aTiempo: { hour: 8, minute: 0 }, // Entre 7:30 y 8:00 = A tiempo, después = Fuera
};

/**
 * Configuración de horas para INGRESOS (entrada) - Horario de verano (enero y febrero):
 * - Temprano (T): antes de las 8:30
 * - A tiempo (A): entre 8:30 y 9:30
 * - Fuera de hora (F): después de las 9:30
 */
export const INGRESO_TIME_CONFIG_VERANO: AttendanceTimeConfig = {
	temprano: { hour: 8, minute: 30 }, // Antes de 8:30 = Temprano
	aTiempo: { hour: 9, minute: 30 }, // Entre 8:30 y 9:30 = A tiempo, después = Fuera
};

/**
 * Configuración de horas para SALIDAS - Horario regular (marzo-diciembre):
 * - Fuera de hora (F): antes de las 14:00
 * - Temprano (T): entre 14:00 y 14:29
 * - A tiempo (A): a partir de las 14:30
 */
export const SALIDA_TIME_CONFIG: AttendanceTimeConfig = {
	temprano: { hour: 14, minute: 0 }, // Antes de 14:00 = Fuera de hora
	aTiempo: { hour: 14, minute: 30 }, // A partir de 14:30 = A tiempo
};

/**
 * Configuración de horas para SALIDAS - Horario de verano (enero y febrero):
 * - Fuera de hora (F): antes de las 12:45
 * - Temprano (T): entre 12:45 y 13:14
 * - A tiempo (A): a partir de las 13:15
 */
export const SALIDA_TIME_CONFIG_VERANO: AttendanceTimeConfig = {
	temprano: { hour: 12, minute: 45 }, // Antes de 12:45 = Fuera de hora
	aTiempo: { hour: 13, minute: 15 }, // A partir de 13:15 = A tiempo
};

/**
 * Determina si un mes es horario de verano (enero o febrero).
 */
export function isHorarioVerano(month: number): boolean {
	return month === 1 || month === 2;
}

/**
 * Compara una hora con un límite de tiempo.
 * Retorna: -1 si es antes, 0 si es igual, 1 si es después.
 */
export function compareTime(hour: number, minute: number, limit: TimeLimit): number {
	const timeInMinutes = hour * 60 + minute;
	const limitInMinutes = limit.hour * 60 + limit.minute;

	if (timeInMinutes < limitInMinutes) return -1;
	if (timeInMinutes > limitInMinutes) return 1;
	return 0;
}

/**
 * Determina el estado de ingreso basado en la hora de entrada.
 * @param hour Hora de entrada
 * @param minute Minutos de entrada
 * @param month Mes (1-12) para aplicar horario de verano en enero/febrero
 */
export function getIngresoStatusFromTime(
	hour: number,
	minute: number,
	month?: number,
): AttendanceStatus {
	const config =
		month && isHorarioVerano(month) ? INGRESO_TIME_CONFIG_VERANO : INGRESO_TIME_CONFIG;

	if (compareTime(hour, minute, config.temprano) < 0) {
		return 'T'; // Temprano
	} else if (compareTime(hour, minute, config.aTiempo) <= 0) {
		return 'A'; // A tiempo
	}
	return 'F'; // Fuera de hora
}

/**
 * Determina el estado de salida basado en la hora de salida.
 * @param hour Hora de salida
 * @param minute Minutos de salida
 * @param month Mes (1-12) para aplicar horario de verano en enero/febrero
 */
export function getSalidaStatusFromTime(
	hour: number,
	minute: number,
	month?: number,
): AttendanceStatus {
	const config = month && isHorarioVerano(month) ? SALIDA_TIME_CONFIG_VERANO : SALIDA_TIME_CONFIG;

	if (compareTime(hour, minute, config.temprano) < 0) {
		return 'F'; // Fuera de hora (salió muy temprano)
	} else if (compareTime(hour, minute, config.aTiempo) < 0) {
		return 'T'; // Temprano
	}
	return 'A'; // A tiempo
}

export const MONTH_OPTIONS: MonthOption[] = [
	{ label: 'Enero', value: 1 },
	{ label: 'Febrero', value: 2 },
	{ label: 'Marzo', value: 3 },
	{ label: 'Abril', value: 4 },
	{ label: 'Mayo', value: 5 },
	{ label: 'Junio', value: 6 },
	{ label: 'Julio', value: 7 },
	{ label: 'Agosto', value: 8 },
	{ label: 'Septiembre', value: 9 },
	{ label: 'Octubre', value: 10 },
	{ label: 'Noviembre', value: 11 },
	{ label: 'Diciembre', value: 12 },
];

export const DAY_HEADERS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const LEGEND_ITEMS: LegendItem[] = [
	{ code: 'T', label: 'Temprano', status: 'T' },
	{ code: 'A', label: 'A tiempo', status: 'A' },
	{ code: 'F', label: 'Fuera de hora', status: 'F' },
	{ code: 'N', label: 'No asistió', status: 'N' },
	{ code: '-', label: 'Pendiente', status: '-' },
];

export const STATUS_CLASSES: Record<AttendanceStatus, string> = {
	T: 'status-temprano',
	A: 'status-atiempo',
	F: 'status-fuera',
	N: 'status-no',
	'-': 'status-pendiente',
	X: 'status-sin-registro',
};

export function getStatusClass(status: AttendanceStatus): string {
	return STATUS_CLASSES[status];
}

/**
 * Normaliza una fecha a medianoche (00:00:00) para comparaciones de solo fecha.
 */
function normalizeDate(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Determina si una fecha es anterior a la fecha de inicio del registro.
 */
export function isBeforeRegistrationStart(date: Date): boolean {
	return normalizeDate(date) < normalizeDate(ATTENDANCE_START_DATE);
}

/**
 * Determina si una fecha es futura (posterior a hoy).
 */
export function isFutureDate(date: Date): boolean {
	const today = normalizeDate(new Date());
	return normalizeDate(date) > today;
}

/**
 * Determina si una fecha es hoy.
 */
export function isToday(date: Date): boolean {
	const today = normalizeDate(new Date());
	return normalizeDate(date).getTime() === today.getTime();
}

/**
 * Determina si ya pasó la hora límite de ingreso para hoy.
 * Usa la hora de "a tiempo" del config correspondiente al mes.
 */
export function hasIngresoTimePassed(month: number): boolean {
	const now = new Date();
	const config = isHorarioVerano(month) ? INGRESO_TIME_CONFIG_VERANO : INGRESO_TIME_CONFIG;
	return compareTime(now.getHours(), now.getMinutes(), config.aTiempo) > 0;
}

/**
 * Determina si ya pasó la hora límite de salida para hoy.
 * Usa la hora de "a tiempo" del config correspondiente al mes.
 */
export function hasSalidaTimePassed(month: number): boolean {
	const now = new Date();
	const config = isHorarioVerano(month) ? SALIDA_TIME_CONFIG_VERANO : SALIDA_TIME_CONFIG;
	return compareTime(now.getHours(), now.getMinutes(), config.aTiempo) >= 0;
}

// ============================================================================
// CONFIGURACIÓN DE PERÍODOS ACADÉMICOS
// ============================================================================

/**
 * Período académico (bimestre) del calendario escolar.
 * Los colegios dividen el año académico en 4 bimestres entre marzo y diciembre.
 * Enero y febrero son períodos vacacionales donde NO se cuentan inasistencias.
 */
export interface PeriodoAcademico {
	/** Número del bimestre (1-4) */
	bimestre: number;
	/** Nombre descriptivo del período */
	nombre: string;
	/** Mes de inicio (1-12) */
	mesInicio: number;
	/** Mes de fin (1-12) */
	mesFin: number;
}

/**
 * Períodos académicos del año escolar (marzo a diciembre).
 * Las inasistencias solo se cuentan durante estos períodos.
 */
export const PERIODOS_ACADEMICOS: PeriodoAcademico[] = [
	{
		bimestre: 1,
		nombre: 'Primer Bimestre',
		mesInicio: 3, // Marzo
		mesFin: 4, // Abril
	},
	{
		bimestre: 2,
		nombre: 'Segundo Bimestre',
		mesInicio: 5, // Mayo
		mesFin: 6, // Junio
	},
	{
		bimestre: 3,
		nombre: 'Tercer Bimestre',
		mesInicio: 8, // Agosto
		mesFin: 9, // Septiembre
	},
	{
		bimestre: 4,
		nombre: 'Cuarto Bimestre',
		mesInicio: 10, // Octubre
		mesFin: 12, // Diciembre
	},
];

/**
 * Meses del período vacacional donde NO se cuentan inasistencias.
 * Incluye:
 * - Enero y febrero: Vacaciones de verano
 * - Julio: Vacaciones de medio año
 */
export const MESES_VACACIONALES = [1, 2, 7]; // Enero, Febrero, Julio

/**
 * Determina si un mes corresponde a un período vacacional.
 * Durante períodos vacacionales NO se cuentan inasistencias (N).
 *
 * @param month Mes (1-12)
 * @returns true si es período vacacional (enero, febrero o julio)
 */
export function isPeriodoVacacional(month: number): boolean {
	return MESES_VACACIONALES.includes(month);
}

/**
 * Determina si un mes corresponde a un período académico.
 * Solo durante períodos académicos se cuentan las inasistencias (N).
 *
 * @param month Mes (1-12)
 * @returns true si es período académico (marzo-abril, mayo-junio, agosto-septiembre, octubre-diciembre)
 */
export function isPeriodoAcademico(month: number): boolean {
	return !isPeriodoVacacional(month);
}

/**
 * Obtiene el bimestre académico para un mes dado.
 *
 * @param month Mes (1-12)
 * @returns Número de bimestre (1-4) o null si es período vacacional
 */
export function getBimestre(month: number): number | null {
	const periodo = PERIODOS_ACADEMICOS.find(
		(p) => month >= p.mesInicio && month <= p.mesFin,
	);
	return periodo ? periodo.bimestre : null;
}

/**
 * Obtiene el nombre del período académico para un mes dado.
 *
 * @param month Mes (1-12)
 * @returns Nombre del período o "Período Vacacional"
 */
export function getNombrePeriodo(month: number): string {
	if (isPeriodoVacacional(month)) {
		if (month === 7) return 'Vacaciones de Medio Año';
		return 'Vacaciones de Verano';
	}

	const periodo = PERIODOS_ACADEMICOS.find(
		(p) => month >= p.mesInicio && month <= p.mesFin,
	);
	return periodo ? periodo.nombre : 'Período Desconocido';
}

/**
 * Determina si una fecha debe contar como inasistencia potencial.
 * Las inasistencias (N) solo se cuentan durante períodos académicos (marzo-diciembre, excepto julio).
 * Durante períodos vacacionales (enero, febrero, julio) NO se marca como inasistencia.
 *
 * @param date Fecha a evaluar
 * @returns true si debe contarse la inasistencia (período académico)
 */
export function shouldCountInasistencia(date: Date): boolean {
	const month = date.getMonth() + 1; // getMonth() retorna 0-11
	return isPeriodoAcademico(month);
}

/**
 * Determina si un día debe marcarse como pendiente ('-') para INGRESOS.
 * Solo aplica a días futuros o de hoy donde aún no pasó la hora límite.
 * NO incluye días anteriores al inicio del registro (esos usan 'X').
 */
export function shouldMarkIngresoAsPending(date: Date, month: number): boolean {
	if (isFutureDate(date)) return true;
	if (isToday(date) && !hasIngresoTimePassed(month)) return true;
	return false;
}

/**
 * Determina si un día debe marcarse como pendiente ('-') para SALIDAS.
 * Solo aplica a días futuros o de hoy donde aún no pasó la hora límite.
 * NO incluye días anteriores al inicio del registro (esos usan 'X').
 */
export function shouldMarkSalidaAsPending(date: Date, month: number): boolean {
	if (isFutureDate(date)) return true;
	if (isToday(date) && !hasSalidaTimePassed(month)) return true;
	return false;
}
