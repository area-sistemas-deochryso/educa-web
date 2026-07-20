// #region Types
import { UserRole } from '@core/services/auth';
import { PreviewLayout } from '@intranet-shared/config/intranet-menu.config';
import { CapabilityCode } from '@shared/types';

export interface QuickAccessItem {
	route: string;
	label: string;
	icon: string;
	capability: CapabilityCode;
	description: string;
	preview: PreviewLayout;
}

// #endregion
// #region Config

export const QUICK_ACCESS_BY_ROLE: Record<UserRole, QuickAccessItem[]> = {
	Director: [
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi-check-square', capability: 'ASISTENCIA', description: 'Control de asistencia diaria', preview: 'attendance' },
		{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi-user-edit', capability: 'ADMIN_USUARIOS', description: 'Gestionar cuentas de usuarios', preview: 'admin-table' },
		{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi-book', capability: 'ADMIN_CURSOS', description: 'Administrar cursos y materias', preview: 'admin-table' },
		{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi-calendar', capability: 'ADMIN_HORARIOS', description: 'Configurar horarios escolares', preview: 'admin-schedule' },
		{ route: '/intranet/admin/notificaciones', label: 'Notificaciones', icon: 'pi-bell', capability: 'ADMIN_NOTIFICACIONES', description: 'Enviar avisos a la comunidad', preview: 'admin-notif' },
		{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi-building', capability: 'ADMIN_SALONES', description: 'Gestionar aulas y secciones', preview: 'salon-tabs' },
	],
	'Asistente Administrativo': [
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi-check-square', capability: 'ASISTENCIA', description: 'Control de asistencia diaria', preview: 'attendance' },
		{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi-user-edit', capability: 'ADMIN_USUARIOS', description: 'Gestionar cuentas de usuarios', preview: 'admin-table' },
		{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi-book', capability: 'ADMIN_CURSOS', description: 'Administrar cursos y materias', preview: 'admin-table' },
		{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi-calendar', capability: 'ADMIN_HORARIOS', description: 'Configurar horarios escolares', preview: 'admin-schedule' },
		{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi-building', capability: 'ADMIN_SALONES', description: 'Gestionar aulas y secciones', preview: 'salon-tabs' },
	],
	Promotor: [
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi-check-square', capability: 'ASISTENCIA', description: 'Control de asistencia diaria', preview: 'attendance' },
		{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi-user-edit', capability: 'ADMIN_USUARIOS', description: 'Gestionar cuentas de usuarios', preview: 'admin-table' },
		{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi-book', capability: 'ADMIN_CURSOS', description: 'Administrar cursos y materias', preview: 'admin-table' },
		{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi-calendar', capability: 'ADMIN_HORARIOS', description: 'Configurar horarios escolares', preview: 'admin-schedule' },
		{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi-building', capability: 'ADMIN_SALONES', description: 'Gestionar aulas y secciones', preview: 'salon-tabs' },
	],
	'Coordinador Académico': [
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi-check-square', capability: 'ASISTENCIA', description: 'Control de asistencia diaria', preview: 'attendance' },
		{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi-user-edit', capability: 'ADMIN_USUARIOS', description: 'Gestionar cuentas de usuarios', preview: 'admin-table' },
		{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi-book', capability: 'ADMIN_CURSOS', description: 'Administrar cursos y materias', preview: 'admin-table' },
		{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi-calendar', capability: 'ADMIN_HORARIOS', description: 'Configurar horarios escolares', preview: 'admin-schedule' },
		{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi-building', capability: 'ADMIN_SALONES', description: 'Gestionar aulas y secciones', preview: 'salon-tabs' },
	],
	Administrador: [
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi-check-square', capability: 'ASISTENCIA', description: 'Control de asistencia diaria', preview: 'attendance' },
		{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi-user-edit', capability: 'ADMIN_USUARIOS', description: 'Gestionar cuentas de usuarios', preview: 'admin-table' },
		{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi-book', capability: 'ADMIN_CURSOS', description: 'Administrar cursos y materias', preview: 'admin-table' },
		{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi-calendar', capability: 'ADMIN_HORARIOS', description: 'Configurar horarios escolares', preview: 'admin-schedule' },
		{ route: '/intranet/admin/notificaciones', label: 'Notificaciones', icon: 'pi-bell', capability: 'ADMIN_NOTIFICACIONES', description: 'Enviar avisos a la comunidad', preview: 'admin-notif' },
		{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi-building', capability: 'ADMIN_SALONES', description: 'Gestionar aulas y secciones', preview: 'salon-tabs' },
	],
	Profesor: [
		{ route: '/intranet/profesor/horarios', label: 'Mi Horario', icon: 'pi-clock', capability: 'PROFESOR_HORARIOS', description: 'Ver tu horario semanal de clases', preview: 'week-schedule' },
		{ route: '/intranet/profesor/cursos', label: 'Mis Cursos', icon: 'pi-book', capability: 'PROFESOR_CURSOS', description: 'Contenido y materiales de tus cursos', preview: 'course-cards' },
		{ route: '/intranet/profesor/calificaciones', label: 'Calificaciones', icon: 'pi-chart-bar', capability: 'PROFESOR_CALIFICACIONES', description: 'Registrar y consultar notas', preview: 'grades' },
		{ route: '/intranet/profesor/asistencia', label: 'Mi Asistencia', icon: 'pi-check-square', capability: 'PROFESOR_ASISTENCIA', description: 'Pasar lista de tus estudiantes', preview: 'attendance' },
		{ route: '/intranet/profesor/foro', label: 'Mi Foro', icon: 'pi-comments', capability: 'PROFESOR_FORO', description: 'Participar en discusiones del aula', preview: 'forum' },
		{ route: '/intranet/profesor/salones', label: 'Mis Salones', icon: 'pi-building', capability: 'PROFESOR_SALONES', description: 'Ver los salones asignados', preview: 'salon-tabs' },
	],
	Apoderado: [
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi-check-square', capability: 'ASISTENCIA', description: 'Revisar asistencia de tu hijo(a)', preview: 'attendance' },
		{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi-book', capability: 'ADMIN_CURSOS', description: 'Ver los cursos disponibles', preview: 'admin-table' },
		{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi-calendar', capability: 'ADMIN_HORARIOS', description: 'Consultar horario de clases', preview: 'admin-schedule' },
		{ route: '/intranet/admin/notificaciones', label: 'Notificaciones', icon: 'pi-bell', capability: 'ADMIN_NOTIFICACIONES', description: 'Avisos del colegio', preview: 'admin-notif' },
	],
	Estudiante: [
		{ route: '/intranet/estudiante/horarios', label: 'Mi Horario', icon: 'pi-clock', capability: 'ESTUDIANTE_HORARIOS', description: 'Ver tu horario semanal de clases', preview: 'week-schedule' },
		{ route: '/intranet/estudiante/cursos', label: 'Mis Cursos', icon: 'pi-book', capability: 'ESTUDIANTE_CURSOS', description: 'Contenido y materiales de tus cursos', preview: 'course-cards' },
		{ route: '/intranet/estudiante/notas', label: 'Mis Calificaciones', icon: 'pi-chart-bar', capability: 'ESTUDIANTE_NOTAS', description: 'Consultar tus calificaciones', preview: 'grades' },
		{ route: '/intranet/estudiante/asistencia', label: 'Mi Asistencia', icon: 'pi-check-square', capability: 'ESTUDIANTE_ASISTENCIA', description: 'Revisar tu registro de asistencia', preview: 'attendance' },
		{ route: '/intranet/estudiante/foro', label: 'Mi Foro', icon: 'pi-comments', capability: 'ESTUDIANTE_FORO', description: 'Participar en discusiones del aula', preview: 'forum' },
		{ route: '/intranet/estudiante/mensajeria', label: 'Mi Mensajeria', icon: 'pi-envelope', capability: 'ESTUDIANTE_MENSAJERIA', description: 'Enviar y recibir mensajes', preview: 'messaging' },
	],
};

export const MAX_QUICK_ACCESS = 4;
// #endregion
