// #region Implementation
/**
 * ConfiguraciÃ³n centralizada de cursos para el mÃ³dulo de horarios.
 * Contiene toda la informaciÃ³n relevante de cada curso.
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
	'MatemÃ¡ticas Avanzadas',
	'FÃ­sica General',
	'QuÃ­mica OrgÃ¡nica',
	'Historia del PerÃº',
	'Literatura Universal',
];

/**
 * InformaciÃ³n completa de cada curso
 */
export const COURSES_CONFIG: CourseInfo[] = [
	{ name: 'MatemÃ¡ticas Avanzadas', schedule: '8:00 a.m. - 9:45 a.m.', attendance: 0, grade: 0 },
	{ name: 'FÃ­sica General', schedule: '10:00 a.m. - 11:45 a.m.', attendance: 20, grade: 20 },
	{ name: 'QuÃ­mica OrgÃ¡nica', schedule: '12:00 p.m. - 12:45 p.m.', attendance: 0, grade: 4 },
	{ name: 'Historia del PerÃº', schedule: '1:00 p.m. - 2:45 p.m.', attendance: 20, grade: 20 },
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
