// #region Imports
import { NavMenuItem } from './components';
import { environment } from '@config/environment';

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
				permiso: 'intranet/calendario',
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
					permiso: 'intranet/estudiante/horarios',
				},
				{
					route: '/intranet/estudiante/cursos',
					label: 'Mis Cursos',
					icon: 'pi pi-book',
					permiso: 'intranet/estudiante/cursos',
				},
				{
					route: '/intranet/estudiante/notas',
					label: 'Mis Calificaciones',
					icon: 'pi pi-chart-bar',
					permiso: 'intranet/estudiante/notas',
				},
				{
					route: '/intranet/estudiante/asistencia',
					label: 'Mi Asistencia',
					icon: 'pi pi-check-square',
					permiso: 'intranet/estudiante/asistencia',
				},
				{
					route: '/intranet/estudiante/foro',
					label: 'Mi Foro',
					icon: 'pi pi-comments',
					permiso: 'intranet/estudiante/foro',
				},
				{
					route: '/intranet/estudiante/mensajeria',
					label: 'Mi Mensajería',
					icon: 'pi pi-envelope',
					permiso: 'intranet/estudiante/mensajeria',
				},
				{
					route: '/intranet/estudiante/salones',
					label: 'Mis Salones',
					icon: 'pi pi-building',
					permiso: 'intranet/estudiante/salones',
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
					permiso: 'intranet/profesor/horarios',
				},
				{
					route: '/intranet/profesor/cursos',
					label: 'Mis Cursos',
					icon: 'pi pi-book',
					permiso: 'intranet/profesor/cursos',
				},
				{
					route: '/intranet/profesor/calificaciones',
					label: 'Mis Calificaciones',
					icon: 'pi pi-chart-bar',
					permiso: 'intranet/profesor/calificaciones',
				},
				{
					route: '/intranet/profesor/asistencia',
					label: 'Mi Asistencia',
					icon: 'pi pi-check-square',
					permiso: 'intranet/profesor/asistencia',
				},
				{
					route: '/intranet/profesor/foro',
					label: 'Mi Foro',
					icon: 'pi pi-comments',
					permiso: 'intranet/profesor/foro',
				},
				{
					route: '/intranet/profesor/mensajeria',
					label: 'Mi Mensajería',
					icon: 'pi pi-envelope',
					permiso: 'intranet/profesor/mensajeria',
				},
				{
					route: '/intranet/profesor/salones',
					label: 'Mis Salones',
					icon: 'pi pi-building',
					permiso: 'intranet/profesor/salones',
				},
				{
					route: '/intranet/profesor/final-salones',
					label: 'Administrar Salones',
					icon: 'pi pi-th-large',
					permiso: 'intranet/profesor/final-salones',
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
					permiso: 'intranet/videoconferencias',
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
				permiso: 'intranet/admin/campus',
			},
		]
	: [];

const devTestK6: NavItemWithPermiso[] = environment.features.ctestK6
	? [
			{
				route: '/intranet/ctest-k6',
				label: 'Test k6',
				icon: 'pi pi-bolt',
				permiso: 'intranet/ctest-k6',
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
		permiso: 'intranet',
	},
	// Alfabético a partir de aquí
	{
		route: '/intranet/asistencia',
		label: 'Asistencia',
		icon: 'pi pi-check-square',
		permiso: 'intranet/asistencia',
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
						permiso: 'intranet/admin/permisos/roles',
					},
					{
						route: '/intranet/admin/permisos/usuarios',
						label: 'Por Usuario',
						icon: 'pi pi-users',
						permiso: 'intranet/admin/permisos/usuarios',
					},
				],
			},
			{
				route: '/intranet/admin/usuarios',
				label: 'Usuarios',
				icon: 'pi pi-user-edit',
				permiso: 'intranet/admin/usuarios',
			},
			{
				route: '/intranet/admin/vistas',
				label: 'Vistas',
				icon: 'pi pi-eye',
				permiso: 'intranet/admin/vistas',
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
				permiso: 'intranet/admin/cursos',
			},
			{
				route: '/intranet/admin/eventos-calendario',
				label: 'Eventos',
				icon: 'pi pi-calendar-plus',
				permiso: 'intranet/admin/eventos-calendario',
			},
			{
				route: '/intranet/admin/horarios',
				label: 'Horarios',
				icon: 'pi pi-calendar',
				permiso: 'intranet/admin/horarios',
			},
			{
				route: '/intranet/admin/notificaciones',
				label: 'Notificaciones',
				icon: 'pi pi-bell',
				permiso: 'intranet/admin/notificaciones',
			},
			{
				route: '/intranet/admin/salones',
				label: 'Salones',
				icon: 'pi pi-building',
				permiso: 'intranet/admin/salones',
			},
		],
	},
	...devMiAula,
	...devTestK6,
];
// #endregion
