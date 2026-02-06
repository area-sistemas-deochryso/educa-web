import { Route, Routes } from '@angular/router';
import { authGuard, permisosGuard } from '@core/guards';

import { IntranetLayoutComponent } from '@shared/components/layout';
import { environment } from '@config/environment';

/**
 * Rutas de features en desarrollo (controladas por environment.features)
 */
const developmentRoutes: Route[] = [
	...(environment.features.horarios
		? [
				{
					path: 'horarios',
					loadComponent: () =>
						import('./pages/schedule-component/schedule.component').then(
							(m) => m.ScheduleComponent,
						),
					title: 'Intranet - ScheduleComponent',
				},
				// {
				// 	path: 'navegacion-campus-salones',
				// 	loadComponent: () =>
				// 		import('./pages/campus-navigation/campus-navigation.component').then(
				// 			(m) => m.CampusNavigationComponent,
				// 		),
				// 	title: 'Intranet - Navegación Campus Salonese',
				// },
			]
		: []),
	...(environment.features.calendario
		? [
				{
					path: 'calendario',
					loadComponent: () =>
						import('./pages/calendary-component/calendary.component').then(
							(m) => m.CalendaryComponent,
						),
					title: 'Intranet - Calendario',
				},
			]
		: []),
	...(environment.features.profesor
		? [
				{
					path: 'profesor/cursos',
					loadComponent: () =>
						import('./pages/profesor').then((m) => m.ProfesorCursosComponent),
					title: 'Intranet - Mis Cursos',
				},
				{
					path: 'profesor/salones',
					loadComponent: () =>
						import('./pages/profesor').then((m) => m.ProfesorSalonesComponent),
					title: 'Intranet - Mis Salones',
				},
				{
					path: 'profesor/horarios',
					loadComponent: () =>
						import('./pages/profesor').then((m) => m.ProfesorHorariosComponent),
					title: 'Intranet - Mi Horario',
				},
			]
		: []),
];

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
			...developmentRoutes,
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
				loadComponent: () => import('./pages/admin/vistas').then((m) => m.VistasComponent),
				title: 'Intranet - Gestión de Vistas',
			},
			{
				path: 'admin/cursos',
				loadComponent: () => import('./pages/admin/cursos').then((m) => m.CursosComponent),
				title: 'Intranet - Gestión de Cursos',
			},
			{
				path: 'admin/horarios',
				loadComponent: () =>
					import('./pages/admin/horarios').then((m) => m.HorariosComponent),
				title: 'Intranet - Gestión de Horarios',
			},
		],
	},
];
