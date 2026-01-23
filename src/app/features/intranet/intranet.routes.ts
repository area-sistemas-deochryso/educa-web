import { Routes } from '@angular/router';
import { authGuard, permisosGuard } from '@core/guards';
import { IntranetLayoutComponent } from '@shared/components/layout';

export const INTRANET_ROUTES: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./pages/login').then((m) => m.LoginIntranetComponent),
		title: 'Intranet - Iniciar Sesión',
	},
	{
		path: '',
		component: IntranetLayoutComponent,
		canActivate: [authGuard],
		canActivateChild: [authGuard, permisosGuard],
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./pages/home-component/home.component').then((m) => m.HomeComponent),
				title: 'Intranet - Inicio',
			},
			{
				path: 'asistencia',
				loadComponent: () =>
					import('./pages/attendance-component/attendance.component').then(
						(m) => m.AttendanceComponent,
					),
				title: 'Intranet - Asistencia',
			},
			{
				path: 'horarios',
				loadComponent: () =>
					import('./pages/schedule-component/schedule.component').then(
						(m) => m.ScheduleComponent,
					),
				title: 'Intranet - Horarios',
			},
			{
				path: 'calendario',
				loadComponent: () =>
					import('./pages/calendary-component/calendary.component').then(
						(m) => m.CalendaryComponent,
					),
				title: 'Intranet - Calendario',
			},
			{
				path: 'admin/permisos/roles',
				loadComponent: () =>
					import('./pages/admin/permisos-roles').then((m) => m.PermisosRolesComponent),
				title: 'Intranet - Permisos por Rol',
			},
			{
				path: 'admin/permisos/usuarios',
				loadComponent: () =>
					import('./pages/admin/permisos-usuarios').then(
						(m) => m.PermisosUsuariosComponent,
					),
				title: 'Intranet - Permisos por Usuario',
			},
			{
				path: 'admin/usuarios',
				loadComponent: () =>
					import('./pages/admin/usuarios').then((m) => m.UsuariosComponent),
				title: 'Intranet - Gestión de Usuarios',
			},
			{
				path: 'admin/vistas',
				loadComponent: () =>
					import('./pages/admin/vistas').then((m) => m.VistasComponent),
				title: 'Intranet - Gestión de Vistas',
			},
		],
	},
];
