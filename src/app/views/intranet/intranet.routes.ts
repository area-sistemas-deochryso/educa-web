import { Routes } from '@angular/router';
import { authGuard } from '../../guards';

export const INTRANET_ROUTES: Routes = [
	{
		path: 'login',
		loadComponent: () => import('../../components/pages').then((m) => m.LoginIntranetComponent),
		title: 'Intranet - Iniciar Sesión',
	},
	{
		path: '',
		loadComponent: () =>
			import('../../components/layout').then((m) => m.IntranetLayoutComponent),
		canActivate: [authGuard],
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
				path: 'Calendario',
				loadComponent: () =>
					import('./pages/calendary-component/calendary.component').then(
						(m) => m.CalendaryComponent,
					),
				title: 'Intranet - Calendario',
			},
		],
	},
];
