// #region Types
import { UserRole } from '@core/services/auth/auth.models';
import { PERMISOS } from '@shared/constants';

/**
 * Wireframe layouts matching actual page structures:
 * - admin-table:    Stats cards + filter row + data table (Usuarios, Cursos, Salones)
 * - admin-schedule: Stats cards + filters + weekly grid with time blocks (Horarios admin)
 * - admin-notif:    Stats cards + filter row + table with priority/tipo tags (Notificaciones)
 * - week-schedule:  Day tabs + weekly grid with colored course blocks (Profesor/Estudiante Horarios)
 * - attendance:     Selector + month toggle + attendance grid with status cells (Asistencia)
 * - grades:         Course selector + vista toggle + grades card with evaluations (Notas/Calificaciones)
 * - forum:          Thread list + messages with avatars (Foro)
 * - messaging:      Contact list + chat bubbles + input (Mensajeria)
 * - course-cards:   Card grid with course info (Mis Cursos)
 * - salon-tabs:     Tab bar + content with sub-sections (Salones profesor)
 */
export type PreviewLayout =
	| 'admin-table'
	| 'admin-schedule'
	| 'admin-notif'
	| 'week-schedule'
	| 'attendance'
	| 'grades'
	| 'forum'
	| 'messaging'
	| 'course-cards'
	| 'salon-tabs';

export interface QuickAccessItem {
	route: string;
	label: string;
	icon: string;
	permiso: string;
	description: string;
	preview: PreviewLayout;
}

// #endregion
// #region Config

/**
 * Quick access shortcuts per role, ordered following the menu hierarchy:
 * Asistencia > Configuracion (Usuarios, Vistas) > Gestion Academica (Cursos, Horarios, Notificaciones, Salones)
 * > Mi Aula (Mi Horario, Mis Cursos, Mis Calificaciones, Mi Asistencia, Mi Foro, Mi Mensajeria, Mis Salones)
 *
 * Only the first 4 items with valid permissions will be shown.
 */
export const QUICK_ACCESS_BY_ROLE: Record<UserRole, QuickAccessItem[]> = {
	Director: [
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi-check-square', permiso: PERMISOS.ASISTENCIA, description: 'Control de asistencia diaria', preview: 'attendance' },
		{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi-user-edit', permiso: PERMISOS.ADMIN_USUARIOS, description: 'Gestionar cuentas de usuarios', preview: 'admin-table' },
		{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi-book', permiso: PERMISOS.ADMIN_CURSOS, description: 'Administrar cursos y materias', preview: 'admin-table' },
		{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi-calendar', permiso: PERMISOS.ADMIN_HORARIOS, description: 'Configurar horarios escolares', preview: 'admin-schedule' },
		{ route: '/intranet/admin/notificaciones', label: 'Notificaciones', icon: 'pi-bell', permiso: PERMISOS.ADMIN_NOTIFICACIONES, description: 'Enviar avisos a la comunidad', preview: 'admin-notif' },
		{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi-building', permiso: PERMISOS.ADMIN_SALONES, description: 'Gestionar aulas y secciones', preview: 'salon-tabs' },
	],
	'Asistente Administrativo': [
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi-check-square', permiso: PERMISOS.ASISTENCIA, description: 'Control de asistencia diaria', preview: 'attendance' },
		{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi-user-edit', permiso: PERMISOS.ADMIN_USUARIOS, description: 'Gestionar cuentas de usuarios', preview: 'admin-table' },
		{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi-book', permiso: PERMISOS.ADMIN_CURSOS, description: 'Administrar cursos y materias', preview: 'admin-table' },
		{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi-calendar', permiso: PERMISOS.ADMIN_HORARIOS, description: 'Configurar horarios escolares', preview: 'admin-schedule' },
		{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi-building', permiso: PERMISOS.ADMIN_SALONES, description: 'Gestionar aulas y secciones', preview: 'salon-tabs' },
	],
	Profesor: [
		{ route: '/intranet/profesor/horarios', label: 'Mi Horario', icon: 'pi-clock', permiso: PERMISOS.PROFESOR_HORARIOS, description: 'Ver tu horario semanal de clases', preview: 'week-schedule' },
		{ route: '/intranet/profesor/cursos', label: 'Mis Cursos', icon: 'pi-book', permiso: PERMISOS.PROFESOR_CURSOS, description: 'Contenido y materiales de tus cursos', preview: 'course-cards' },
		{ route: '/intranet/profesor/calificaciones', label: 'Calificaciones', icon: 'pi-chart-bar', permiso: PERMISOS.PROFESOR_CALIFICACIONES, description: 'Registrar y consultar notas', preview: 'grades' },
		{ route: '/intranet/profesor/asistencia', label: 'Mi Asistencia', icon: 'pi-check-square', permiso: PERMISOS.PROFESOR_ASISTENCIA, description: 'Pasar lista de tus estudiantes', preview: 'attendance' },
		{ route: '/intranet/profesor/foro', label: 'Mi Foro', icon: 'pi-comments', permiso: PERMISOS.PROFESOR_FORO, description: 'Participar en discusiones del aula', preview: 'forum' },
		{ route: '/intranet/profesor/salones', label: 'Mis Salones', icon: 'pi-building', permiso: PERMISOS.PROFESOR_SALONES, description: 'Ver los salones asignados', preview: 'salon-tabs' },
	],
	Apoderado: [
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi-check-square', permiso: PERMISOS.ASISTENCIA, description: 'Revisar asistencia de tu hijo(a)', preview: 'attendance' },
		{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi-book', permiso: PERMISOS.ADMIN_CURSOS, description: 'Ver los cursos disponibles', preview: 'admin-table' },
		{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi-calendar', permiso: PERMISOS.ADMIN_HORARIOS, description: 'Consultar horario de clases', preview: 'admin-schedule' },
		{ route: '/intranet/admin/notificaciones', label: 'Notificaciones', icon: 'pi-bell', permiso: PERMISOS.ADMIN_NOTIFICACIONES, description: 'Avisos del colegio', preview: 'admin-notif' },
	],
	Estudiante: [
		{ route: '/intranet/estudiante/horarios', label: 'Mi Horario', icon: 'pi-clock', permiso: PERMISOS.ESTUDIANTE_HORARIOS, description: 'Ver tu horario semanal de clases', preview: 'week-schedule' },
		{ route: '/intranet/estudiante/cursos', label: 'Mis Cursos', icon: 'pi-book', permiso: PERMISOS.ESTUDIANTE_CURSOS, description: 'Contenido y materiales de tus cursos', preview: 'course-cards' },
		{ route: '/intranet/estudiante/notas', label: 'Mis Notas', icon: 'pi-chart-bar', permiso: PERMISOS.ESTUDIANTE_NOTAS, description: 'Consultar tus calificaciones', preview: 'grades' },
		{ route: '/intranet/estudiante/asistencia', label: 'Mi Asistencia', icon: 'pi-check-square', permiso: PERMISOS.ESTUDIANTE_ASISTENCIA, description: 'Revisar tu registro de asistencia', preview: 'attendance' },
		{ route: '/intranet/estudiante/foro', label: 'Mi Foro', icon: 'pi-comments', permiso: PERMISOS.ESTUDIANTE_FORO, description: 'Participar en discusiones del aula', preview: 'forum' },
		{ route: '/intranet/estudiante/mensajeria', label: 'Mi Mensajeria', icon: 'pi-envelope', permiso: PERMISOS.ESTUDIANTE_MENSAJERIA, description: 'Enviar y recibir mensajes', preview: 'messaging' },
	],
};

export const MAX_QUICK_ACCESS = 4;
// #endregion
