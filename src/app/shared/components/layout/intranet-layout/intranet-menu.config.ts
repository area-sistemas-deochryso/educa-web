import { NavMenuItem } from './components';

export interface NavItemWithPermiso extends NavMenuItem {
	permiso?: string;
	children?: NavItemWithPermiso[];
}

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
	{
		route: '/intranet/horarios',
		label: 'Horarios',
		icon: 'pi pi-clock',
		permiso: 'intranet/horarios',
	},
	{
		route: '/intranet/calendario',
		label: 'Calendario',
		icon: 'pi pi-calendar',
		permiso: 'intranet/calendario',
	},
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
		],
	},
];
