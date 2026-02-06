import { NavMenuItem } from './components';
import { environment } from '@config/environment';

export interface NavItemWithPermiso extends NavMenuItem {
	permiso?: string;
	children?: NavItemWithPermiso[];
}

/**
 * Items de menú para features en desarrollo (controlados por environment.features)
 */
const developmentMenuItems: NavItemWithPermiso[] = [
	...(environment.features.horarios
		? [
				{
					route: '/intranet/horarios',
					label: 'Horarios',
					icon: 'pi pi-clock',
					permiso: 'intranet/horarios',
				},
			]
		: []),
	...(environment.features.calendario
		? [
				{
					route: '/intranet/calendario',
					label: 'Calendario',
					icon: 'pi pi-calendar',
					permiso: 'intranet/calendario',
				},
			]
		: []),
	...(environment.features.profesor
		? [
				{
					label: 'Mi Aula',
					icon: 'pi pi-building',
					children: [
						{
							route: '/intranet/profesor/cursos',
							label: 'Cursos',
							icon: 'pi pi-book',
							permiso: 'intranet/profesor/cursos',
						},
						{
							route: '/intranet/profesor/salones',
							label: 'Salones',
							icon: 'pi pi-building',
							permiso: 'intranet/profesor/salones',
						},
						{
							route: '/intranet/profesor/horarios',
							label: 'Horarios',
							icon: 'pi pi-clock',
							permiso: 'intranet/profesor/horarios',
						},
					],
				} as NavItemWithPermiso,
			]
		: []),
];

/**
 * Configuración jerárquica del menú de la intranet.
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
	{
		route: '/intranet/asistencia',
		label: 'Asistencia',
		icon: 'pi pi-check-square',
		permiso: 'intranet/asistencia',
	},
	...developmentMenuItems,
	{
		label: 'Admin',
		icon: 'pi pi-cog',
		children: [
			{
				label: 'Permisos',
				icon: 'pi pi-shield',
				children: [
					{
						route: '/intranet/admin/permisos/roles',
						label: 'Roles',
						icon: 'pi pi-id-card',
						permiso: 'intranet/admin/permisos/roles',
					},
					{
						route: '/intranet/admin/permisos/usuarios',
						label: 'Usuarios',
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
			{
				route: '/intranet/admin/cursos',
				label: 'Cursos',
				icon: 'pi pi-book',
				permiso: 'intranet/admin/cursos',
			},
			{
				route: '/intranet/admin/horarios',
				label: 'Horarios',
				icon: 'pi pi-calendar',
				permiso: 'intranet/admin/horarios',
			},
		],
	},
];
