// #region Implementation
/**
 * Configuración centralizada de cursos para el módulo de horarios.
 * Contiene toda la información relevante de cada curso.
 */

export interface CourseSchedule {
	name: string;
	time: string;
}

export interface CourseSummary {
	name: string;
	attendance: number;
	grade: number;
}

export interface CourseInfo {
	name: string;
	schedule: string;
	attendance: number;
	grade: number;
}

/**
 * Lista de nombres de cursos disponibles
 */
export const COURSE_NAMES: string[] = [
	'Matemáticas Avanzadas',
	'Física General',
	'Química Orgánica',
	'Historia del Perú',
	'Literatura Universal',
];

/**
 * Información completa de cada curso
 */
export const COURSES_CONFIG: CourseInfo[] = [
	{ name: 'Matemáticas Avanzadas', schedule: '8:00 a.m. - 9:45 a.m.', attendance: 0, grade: 0 },
	{ name: 'Física General', schedule: '10:00 a.m. - 11:45 a.m.', attendance: 20, grade: 20 },
	{ name: 'Química Orgánica', schedule: '12:00 p.m. - 12:45 p.m.', attendance: 0, grade: 4 },
	{ name: 'Historia del Perú', schedule: '1:00 p.m. - 2:45 p.m.', attendance: 20, grade: 20 },
	{ name: 'Literatura Universal', schedule: '3:00 p.m. - 5:00 p.m.', attendance: 0, grade: 16 },
];

/**
 * Obtiene los datos de horario de los cursos
 */
export function getCourseSchedules(): CourseSchedule[] {
	return COURSES_CONFIG.map((course) => ({
		name: course.name,
		time: course.schedule,
	}));
}

/**
 * Obtiene los datos de resumen de los cursos
 */
export function getCourseSummaries(): CourseSummary[] {
	return COURSES_CONFIG.map((course) => ({
		name: course.name,
		attendance: course.attendance,
		grade: course.grade,
	}));
}
// #endregion
