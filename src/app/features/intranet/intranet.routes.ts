/* eslint-disable max-lines -- Razón: archivo central de rutas de la intranet; crece linealmente con cada feature nuevo registrado y cada spread condicional por feature flag. Fraccionarlo (ej: `intranet-admin.routes.ts`) es un refactor transversal y se posterga como deuda técnica menor. */
// #region Imports
import { Route, Routes } from '@angular/router';
import { authGuard, permissionsGuard } from '@core/guards';

import { IntranetLayoutComponent } from '@intranet-shared/components/layout/intranet-layout';
import { environment } from '@config/environment';
// #endregion

// #region Rutas por rol
const PROFESOR_ROUTES: Route[] = [
	{
		path: 'profesor/asistencia',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.TeacherAttendanceComponent),
		title: 'Intranet - Asistencia',
	},
	{
		path: 'profesor/calificaciones',
		loadComponent: () =>
			import('./pages/profesor').then((m) => m.TeacherGradesComponent),
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
			import('./pages/profesor').then((m) => m.TeacherFinalClassroomsComponent),
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
			import('./pages/profesor').then((m) => m.TeacherSchedulesComponent),
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
			import('./pages/profesor').then((m) => m.TeacherClassroomsComponent),
		title: 'Intranet - Mis Salones',
	},
];

const ESTUDIANTE_ROUTES: Route[] = [
	{
		path: 'estudiante/asistencia',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.StudentAttendanceComponent),
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
			import('./pages/estudiante').then((m) => m.StudentSchedulesComponent),
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
			import('./pages/estudiante').then((m) => m.StudentClassroomsComponent),
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
						import('./pages/cross-role/schedule-component/schedule.component').then(
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
						import('./pages/cross-role/calendary-component/calendary.component').then(
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
						import('./pages/cross-role/videoconferencias').then(
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
						import('./pages/cross-role/ctest-k6').then((m) => m.CTestK6Component),
					title: 'Intranet - Test k6',
				},
			]
		: []),
	...(environment.features.rateLimitMonitoring
		? [
				{
					path: 'admin/rate-limit-events',
					loadComponent: () =>
						import('./pages/admin/rate-limit-events').then(
							(m) => m.RateLimitEventsComponent,
						),
					title: 'Intranet - Telemetría de Rate Limiting',
				},
			]
		: []),
	...(environment.features.auditoriaCorreos
		? [
				{
					path: 'admin/auditoria-correos',
					loadComponent: () =>
						import('./pages/admin/auditoria-correos').then(
							(m) => m.AuditoriaCorreosComponent,
						),
					title: 'Intranet - Auditoría de Correos',
				},
			]
		: []),
	...(environment.features.emailOutboxDashboardDia
		? [
				{
					path: 'admin/email-outbox/dashboard-dia',
					loadComponent: () =>
						import('./pages/admin/email-outbox-dashboard-dia').then(
							(m) => m.EmailOutboxDashboardDiaComponent,
						),
					title: 'Intranet - Dashboard de Correos',
				},
			]
		: []),
	...(environment.features.emailOutboxDiagnostico
		? [
				{
					path: 'admin/email-outbox/diagnostico',
					loadComponent: () =>
						import('./pages/admin/email-outbox-diagnostico').then(
							(m) => m.EmailOutboxDiagnosticoComponent,
						),
					title: 'Intranet - Diagnóstico de Correos',
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
		canActivateChild: [authGuard, permissionsGuard],
		children: [
			// #region Shared
			{
				path: '',
				loadComponent: () =>
					import('./pages/cross-role/home-component/home.component').then(
						(m) => m.HomeComponent,
					),
				title: 'Intranet - Inicio',
			},
			{
				path: 'asistencia',
				loadComponent: () =>
					import('./pages/cross-role/attendance-component/attendance.component').then(
						(m) => m.AttendanceComponent,
					),
				title: 'Intranet - Asistencia',
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
					import('./pages/admin/permissions-roles').then((m) => m.PermissionsRolesComponent),
				title: 'Intranet - Permisos por Rol',
			},
			{
				path: 'admin/permisos/usuarios',
				loadComponent: () =>
					import('./pages/admin/permissions-users').then(
						(m) => m.PermissionsUsersComponent,
					),
				title: 'Intranet - Permisos por Usuario',
			},
			{
				path: 'admin/usuarios',
				loadComponent: () =>
					import('./pages/admin/users').then((m) => m.UsersComponent),
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
					import('./pages/admin/schedules').then((m) => m.SchedulesComponent),
				title: 'Intranet - Gestión de Horarios',
			},
			{
				path: 'admin/salones',
				loadComponent: () =>
					import('./pages/admin/classrooms').then((m) => m.ClassroomsAdminComponent),
				title: 'Intranet - Gestión de Salones',
			},
			{
				path: 'admin/asistencias',
				loadComponent: () =>
					import('./pages/admin/attendances').then((m) => m.AttendancesComponent),
				title: 'Intranet - Gestión de Asistencias',
			},
			{
				path: 'admin/permisos-salud',
				loadComponent: () =>
					import('./pages/admin/health-permissions/admin-health-permissions.component').then(
						(m) => m.AdminHealthPermissionsComponent,
					),
				title: 'Intranet - Permisos de Salud',
			},
			{
				path: 'admin/eventos-calendario',
				loadComponent: () =>
					import('./pages/admin/events-calendar').then(
						(m) => m.EventsCalendarComponent,
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
			{
				path: 'admin/trazabilidad-errores',
				loadComponent: () =>
					import('./pages/admin/error-logs').then((m) => m.ErrorLogsComponent),
				title: 'Intranet - Trazabilidad de Errores',
			},
			{
				// Plan 32 Chat 4 — Hub central que cruza los 4 tipos de telemetría que
				// comparten un correlation id. Deep-link only (sin entrada de menú).
				// Reusa el permiso de error-logs vía data.permissionPath porque la ruta
				// con :id nunca matchea exact en vistasPermitidas.
				path: 'admin/correlation/:id',
				loadComponent: () =>
					import('./pages/admin/correlation').then((m) => m.CorrelationComponent),
				data: { permissionPath: 'intranet/admin/trazabilidad-errores' },
				title: 'Intranet - Eventos correlacionados',
			},
			{
				path: 'admin/reportes-usuario',
				loadComponent: () =>
					import('./pages/admin/feedback-reports').then((m) => m.FeedbackReportsComponent),
				title: 'Intranet - Reportes de Usuarios',
			},
			// #endregion
		],
	},
];
