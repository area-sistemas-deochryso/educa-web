// #region Imports
import { NavMenuItem } from '@shared/components/layout/intranet-layout/components';
import { environment } from '@config/environment';
import { PERMISOS } from '@shared/constants';

// #endregion
// #region Implementation
export interface NavItemWithPermiso extends NavMenuItem {
	permiso?: string;
	children?: NavItemWithPermiso[];
}

/**
 * Items de menú en desarrollo, separados para insertarse en orden alfabético
 * dentro de INTRANET_MENU (controlados por environment.features)
 */
const devCalendario: NavItemWithPermiso[] = environment.features.calendario
	? [
			{
				route: '/intranet/calendario',
				label: 'Calendario',
				icon: 'pi pi-calendar',
				permiso: PERMISOS.CALENDARIO,
			},
		]
	: [];

// Mi Aula: un solo entry con children de ambos roles, filtrados por permisos en runtime
const miAulaChildren: NavItemWithPermiso[] = [
	// Estudiante
	...(environment.features.estudiante
		? [
				{
					route: '/intranet/estudiante/horarios',
					label: 'Mi Horario',
					icon: 'pi pi-clock',
					permiso: PERMISOS.ESTUDIANTE_HORARIOS,
				},
				{
					route: '/intranet/estudiante/cursos',
					label: 'Mis Cursos',
					icon: 'pi pi-book',
					permiso: PERMISOS.ESTUDIANTE_CURSOS,
				},
				{
					route: '/intranet/estudiante/notas',
					label: 'Mis Calificaciones',
					icon: 'pi pi-chart-bar',
					permiso: PERMISOS.ESTUDIANTE_NOTAS,
				},
				{
					route: '/intranet/estudiante/asistencia',
					label: 'Mi Asistencia',
					icon: 'pi pi-check-square',
					permiso: PERMISOS.ESTUDIANTE_ASISTENCIA,
				},
				{
					route: '/intranet/estudiante/foro',
					label: 'Mi Foro',
					icon: 'pi pi-comments',
					permiso: PERMISOS.ESTUDIANTE_FORO,
				},
				{
					route: '/intranet/estudiante/mensajeria',
					label: 'Mi Mensajería',
					icon: 'pi pi-envelope',
					permiso: PERMISOS.ESTUDIANTE_MENSAJERIA,
				},
				{
					route: '/intranet/estudiante/salones',
					label: 'Mis Salones',
					icon: 'pi pi-building',
					permiso: PERMISOS.ESTUDIANTE_SALONES,
				},
			]
		: []),
	// Profesor
	...(environment.features.profesor
		? [
				{
					route: '/intranet/profesor/horarios',
					label: 'Mi Horario',
					icon: 'pi pi-clock',
					permiso: PERMISOS.PROFESOR_HORARIOS,
				},
				{
					route: '/intranet/profesor/cursos',
					label: 'Mis Cursos',
					icon: 'pi pi-book',
					permiso: PERMISOS.PROFESOR_CURSOS,
				},
				{
					route: '/intranet/profesor/calificaciones',
					label: 'Mis Calificaciones',
					icon: 'pi pi-chart-bar',
					permiso: PERMISOS.PROFESOR_CALIFICACIONES,
				},
				{
					route: '/intranet/profesor/asistencia',
					label: 'Mi Asistencia',
					icon: 'pi pi-check-square',
					permiso: PERMISOS.PROFESOR_ASISTENCIA,
				},
				{
					route: '/intranet/profesor/foro',
					label: 'Mi Foro',
					icon: 'pi pi-comments',
					permiso: PERMISOS.PROFESOR_FORO,
				},
				{
					route: '/intranet/profesor/mensajeria',
					label: 'Mi Mensajería',
					icon: 'pi pi-envelope',
					permiso: PERMISOS.PROFESOR_MENSAJERIA,
				},
				{
					route: '/intranet/profesor/salones',
					label: 'Mis Salones',
					icon: 'pi pi-building',
					permiso: PERMISOS.PROFESOR_SALONES,
				},
				{
					route: '/intranet/profesor/final-salones',
					label: 'Administrar Salones',
					icon: 'pi pi-th-large',
					permiso: PERMISOS.PROFESOR_FINAL_SALONES,
				},
			]
		: []),
	// Videoconferencias (compartido)
	...(environment.features.videoconferencias
		? [
				{
					route: '/intranet/videoconferencias',
					label: 'Videoconferencias',
					icon: 'pi pi-video',
					permiso: PERMISOS.VIDEOCONFERENCIAS,
				},
			]
		: []),
];

const devMiAula: NavItemWithPermiso[] =
	miAulaChildren.length > 0
		? [
				{
					label: 'Mi Aula',
					icon: 'pi pi-graduation-cap',
					children: miAulaChildren,
				},
			]
		: [];

const devCampus: NavItemWithPermiso[] = environment.features.campusNavigation
	? [
			{
				route: '/intranet/admin/campus',
				label: 'Campus',
				icon: 'pi pi-map',
				permiso: PERMISOS.ADMIN_CAMPUS,
			},
		]
	: [];

const devTestK6: NavItemWithPermiso[] = environment.features.ctestK6
	? [
			{
				route: '/intranet/ctest-k6',
				label: 'Test k6',
				icon: 'pi pi-bolt',
				permiso: PERMISOS.CTEST_K6,
			},
		]
	: [];

/**
 * Configuración jerárquica del menú de la intranet.
 * - "Inicio" siempre primero (punto de entrada)
 * - El resto en orden alfabético dentro de cada nivel
 * - Los items con `permiso` son hojas que requieren ese permiso exacto
 * - Los items con `children` son padres que se muestran si al menos un hijo tiene permiso
 */
export const INTRANET_MENU: NavItemWithPermiso[] = [
	{
		route: '/intranet',
		label: 'Inicio',
		icon: 'pi pi-home',
		exact: true,
		permiso: PERMISOS.INTRANET,
	},
	// Alfabético a partir de aquí
	{
		route: '/intranet/asistencia',
		label: 'Asistencia',
		icon: 'pi pi-check-square',
		permiso: PERMISOS.ASISTENCIA,
	},
	{
		route: '/intranet/reportes-asistencia',
		label: 'Reportes Asistencia',
		icon: 'pi pi-chart-bar',
		permiso: PERMISOS.REPORTES_ASISTENCIA,
	},
	{
		label: 'Configuración',
		icon: 'pi pi-cog',
		children: [
			{
				label: 'Permisos',
				icon: 'pi pi-shield',
				children: [
					{
						route: '/intranet/admin/permisos/roles',
						label: 'Por Rol',
						icon: 'pi pi-id-card',
						permiso: PERMISOS.ADMIN_PERMISOS_ROLES,
					},
					{
						route: '/intranet/admin/permisos/usuarios',
						label: 'Por Usuario',
						icon: 'pi pi-users',
						permiso: PERMISOS.ADMIN_PERMISOS_USUARIOS,
					},
				],
			},
			{
				route: '/intranet/admin/usuarios',
				label: 'Usuarios',
				icon: 'pi pi-user-edit',
				permiso: PERMISOS.ADMIN_USUARIOS,
			},
			{
				route: '/intranet/admin/vistas',
				label: 'Vistas',
				icon: 'pi pi-eye',
				permiso: PERMISOS.ADMIN_VISTAS,
			},
		],
	},
	{
		label: 'Gestión Académica',
		icon: 'pi pi-graduation-cap',
		children: [
			...devCalendario,
			...devCampus,
			{
				route: '/intranet/admin/cursos',
				label: 'Cursos',
				icon: 'pi pi-book',
				permiso: PERMISOS.ADMIN_CURSOS,
			},
			{
				route: '/intranet/admin/eventos-calendario',
				label: 'Eventos',
				icon: 'pi pi-calendar-plus',
				permiso: PERMISOS.ADMIN_EVENTOS_CALENDARIO,
			},
			{
				route: '/intranet/admin/horarios',
				label: 'Horarios',
				icon: 'pi pi-calendar',
				permiso: PERMISOS.ADMIN_HORARIOS,
			},
			{
				route: '/intranet/admin/notificaciones',
				label: 'Notificaciones',
				icon: 'pi pi-bell',
				permiso: PERMISOS.ADMIN_NOTIFICACIONES,
			},
			{
				route: '/intranet/admin/salones',
				label: 'Salones',
				icon: 'pi pi-building',
				permiso: PERMISOS.ADMIN_SALONES,
			},
			{
				route: '/intranet/admin/asistencias',
				label: 'Asistencias',
				icon: 'pi pi-clock',
				permiso: PERMISOS.ADMIN_ASISTENCIAS,
			},
			{
				route: '/intranet/admin/email-outbox',
				label: 'Bandeja de Correos',
				icon: 'pi pi-envelope',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX,
			},
		],
	},
	...devMiAula,
	...devTestK6,
];
// #endregion
