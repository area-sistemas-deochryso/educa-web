// #region Imports
import { Route, Routes } from '@angular/router';
import { authGuard, permisosGuard } from '@core/guards';

import { IntranetLayoutComponent } from '@shared/components/layout';
import { environment } from '@config/environment';
// #endregion

// #region Rutas por rol
const PROFESOR_ROUTES: Route[] = [
	{
		path: 'profesor/asistencia',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.ProfesorAsistenciaComponent),
		title: 'Intranet - Asistencia',
	},
	{
		path: 'profesor/calificaciones',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.ProfesorCalificacionesComponent),
		title: 'Intranet - Calificaciones',
	},
	{
		path: 'profesor/cursos',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.ProfesorCursosComponent),
		title: 'Intranet - Mis Cursos',
	},
	{
		path: 'profesor/final-salones',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.ProfesorFinalSalonesComponent),
		title: 'Intranet - Gestión de Salones',
	},
	{
		path: 'profesor/foro',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.ProfesorForoComponent),
		title: 'Intranet - Foro',
	},
	{
		path: 'profesor/horarios',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.ProfesorHorariosComponent),
		title: 'Intranet - Mi Horario',
	},
	{
		path: 'profesor/mensajeria',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.ProfesorMensajeriaComponent),
		title: 'Intranet - Mensajería',
	},
	{
		path: 'profesor/salones',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.ProfesorSalonesComponent),
		title: 'Intranet - Mis Salones',
	},
];

const ESTUDIANTE_ROUTES: Route[] = [
	{
		path: 'estudiante/asistencia',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.EstudianteAsistenciaComponent),
		title: 'Intranet - Mi Asistencia',
	},
	{
		path: 'estudiante/cursos',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.EstudianteCursosComponent),
		title: 'Intranet - Mis Cursos',
	},
	{
		path: 'estudiante/foro',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.EstudianteForoComponent),
		title: 'Intranet - Foro',
	},
	{
		path: 'estudiante/horarios',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.EstudianteHorariosComponent),
		title: 'Intranet - Mi Horario',
	},
	{
		path: 'estudiante/mensajeria',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.EstudianteMensajeriaComponent),
		title: 'Intranet - Mensajería',
	},
	{
		path: 'estudiante/notas',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.EstudianteNotasComponent),
		title: 'Intranet - Mis Calificaciones',
	},
	{
		path: 'estudiante/salones',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.EstudianteSalonesComponent),
		title: 'Intranet - Mis Salones',
	},
];
// #endregion

// #region Rutas con feature flags
/**
 * Rutas de roles activas según environment.features.
 * El flag permite despliegue gradual; ambas son true en producción.
 */
const roleFeatureRoutes: Route[] = [
	...(environment.features.profesor ? PROFESOR_ROUTES : []),
	...(environment.features.estudiante ? ESTUDIANTE_ROUTES : []),
];

/**
 * Rutas experimentales o en desarrollo activo.
 * Por defecto false en producción hasta que estén listas.
 */
const experimentalRoutes: Route[] = [
	...(environment.features.horarios
		? [
				{
					path: 'horarios',
					loadComponent: () =>
						import('./pages/shared/schedule-component/schedule.component').then(
							(m) => m.ScheduleComponent,
						),
					title: 'Intranet - Horarios',
				},
			]
		: []),
	...(environment.features.calendario
		? [
				{
					path: 'calendario',
					loadComponent: () =>
						import('./pages/shared/calendary-component/calendary.component').then(
							(m) => m.CalendaryComponent,
						),
					title: 'Intranet - Calendario',
				},
			]
		: []),
	...(environment.features.videoconferencias
		? [
				{
					path: 'videoconferencias',
					loadComponent: () =>
						import('./pages/shared/videoconferencias').then(
							(m) => m.VideoconferenciasComponent,
						),
					title: 'Intranet - Videoconferencias',
				},
			]
		: []),
	...(environment.features.campusNavigation
		? [
				{
					path: 'admin/campus',
					loadComponent: () =>
						import('./pages/admin/campus').then((m) => m.CampusComponent),
					title: 'Intranet - Editor de Campus',
				},
				// Navegación de campus NO es una ruta independiente —
				// se embebe directamente en EstudianteSalonDialog y SalonEstudiantesDialog
				// vía el mismo feature flag (campusNavigation)
			]
		: []),
	...(environment.features.ctestK6
		? [
				{
					path: 'ctest-k6',
					loadComponent: () =>
						import('./pages/shared/ctest-k6').then((m) => m.CTestK6Component),
					title: 'Intranet - Test k6',
				},
			]
		: []),
];
// #endregion

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
			// #region Shared
			{
				path: '',
				loadComponent: () =>
					import('./pages/shared/home-component/home.component').then(
						(m) => m.HomeComponent,
					),
				title: 'Intranet - Inicio',
			},
			{
				path: 'asistencia',
				loadComponent: () =>
					import('./pages/shared/attendance-component/attendance.component').then(
						(m) => m.AttendanceComponent,
					),
				title: 'Intranet - Asistencia',
			},
			{
				path: 'reportes-asistencia',
				loadComponent: () =>
					import('./pages/shared/reportes-asistencia').then(
						(m) => m.ReportesAsistenciaComponent,
					),
				title: 'Intranet - Reportes de Asistencia',
			},
			// #endregion

			// #region Por rol (profesor / estudiante)
			...roleFeatureRoutes,
			// #endregion

			// #region Admin
			...experimentalRoutes,
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
			{
				path: 'admin/cursos',
				loadComponent: () =>
					import('./pages/admin/cursos').then((m) => m.CursosComponent),
				title: 'Intranet - Gestión de Cursos',
			},
			{
				path: 'admin/horarios',
				loadComponent: () =>
					import('./pages/admin/horarios').then((m) => m.HorariosComponent),
				title: 'Intranet - Gestión de Horarios',
			},
			{
				path: 'admin/salones',
				loadComponent: () =>
					import('./pages/admin/salones').then((m) => m.SalonesAdminComponent),
				title: 'Intranet - Gestión de Salones',
			},
			{
				path: 'admin/asistencias',
				loadComponent: () =>
					import('./pages/admin/asistencias').then((m) => m.AsistenciasComponent),
				title: 'Intranet - Gestión de Asistencias',
			},
			{
				path: 'admin/eventos-calendario',
				loadComponent: () =>
					import('./pages/admin/eventos-calendario').then(
						(m) => m.EventosCalendarioComponent,
					),
				title: 'Intranet - Gestión de Eventos',
			},
			{
				path: 'admin/notificaciones',
				loadComponent: () =>
					import('./pages/admin/notificaciones-admin').then(
						(m) => m.NotificacionesAdminComponent,
					),
				title: 'Intranet - Gestión de Notificaciones',
			},
			{
				path: 'admin/email-outbox',
				loadComponent: () =>
					import('./pages/admin/email-outbox').then((m) => m.EmailOutboxComponent),
				title: 'Intranet - Bandeja de Correos',
			},
			// #endregion
		],
	},
];
