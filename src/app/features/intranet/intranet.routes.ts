/* eslint-disable max-lines -- Razón: archivo central de rutas de la intranet; crece linealmente con cada feature nuevo registrado y cada spread condicional por feature flag. Fraccionarlo (ej: `intranet-admin.routes.ts`) es un refactor transversal y se posterga como deuda técnica menor. */
// #region Imports
import { Route, Routes } from '@angular/router';
import { authGuard, permissionsGuard, viewAsGateGuard } from '@core/guards';
import type { ViewAsRol } from '@core/services/view-as';

import { IntranetLayoutComponent } from '@intranet-shared/components/layout/intranet-layout';
import { environment } from '@config/environment';
// #endregion

// #region "Ver como" (P92 F2)
/**
 * Tags every route in `routesArr` with `canActivate: [viewAsGateGuard]` and
 * `data.viewAsRol`, so an Administrador can't reach any page of the module
 * without first choosing a user of the matching role (decision #3). No-op
 * for real profesores/estudiantes — see `viewAsGateGuard`.
 */
function withViewAsGate(viewAsRol: ViewAsRol, routesArr: Route[]): Route[] {
	return routesArr.map((r) => ({
		...r,
		canActivate: [viewAsGateGuard, ...(r.canActivate ?? [])],
		data: { ...r.data, viewAsRol },
	}));
}
// #endregion

// #region Rutas por rol
const PROFESOR_ROUTES_RAW: Route[] = [
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
const PROFESOR_ROUTES: Route[] = withViewAsGate('Profesor', PROFESOR_ROUTES_RAW);

const ESTUDIANTE_ROUTES_RAW: Route[] = [
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
		path: 'estudiante/rendimiento',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.EstudianteRendimientoComponent),
		title: 'Intranet - Mi Rendimiento',
	},
	{
		path: 'estudiante/salones',
		loadComponent: () =>
			import('./pages/estudiante').then((m) => m.StudentClassroomsComponent),
		title: 'Intranet - Mis Salones',
	},
];
const ESTUDIANTE_ROUTES: Route[] = withViewAsGate('Estudiante', ESTUDIANTE_ROUTES_RAW);
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
	...(environment.features.runtimeHealth
		? [
				{
					path: 'admin/sistema/runtime-health',
					loadComponent: () =>
						import('./pages/admin/sistema/runtime-health/runtime-health.component').then(
							(m) => m.RuntimeHealthPageComponent,
						),
					title: 'Intranet - Salud del runtime',
				},
			]
		: []),
	...(environment.features.dbDiagnostics
		? [
				{
					path: 'admin/sistema/db-diagnostics',
					loadComponent: () =>
						import('./pages/admin/sistema/diagnostico-db/diagnostico-db.component').then(
							(m) => m.DiagnosticoDbPageComponent,
						),
					title: 'Intranet - Diagnóstico de base de datos',
				},
			]
		: []),
];

/**
 * Redirects de las 7 URLs antiguas del submódulo "Monitoreo" hacia su nueva
 * ubicación bajo `/admin/monitoreo`. Conservan bookmarks, deep-links externos
 * (correos, Slack, Plan 32) y referencias en histórico.
 *
 * Plan 35 — Rediseño UX/UI Monitoreo, 2026-04-27.
 */
const MONITOREO_LEGACY_REDIRECTS: Route[] = [
	{ path: 'admin/email-outbox', redirectTo: 'admin/monitoreo/correos/bandeja', pathMatch: 'full' },
	{
		path: 'admin/email-outbox/dashboard-dia',
		redirectTo: 'admin/monitoreo/correos/dashboard',
		pathMatch: 'full',
	},
	{
		path: 'admin/email-outbox/diagnostico',
		redirectTo: 'admin/monitoreo/correos/diagnostico',
		pathMatch: 'full',
	},
	{
		path: 'admin/auditoria-correos',
		redirectTo: 'admin/monitoreo/correos/auditoria',
		pathMatch: 'full',
	},
	{
		path: 'admin/trazabilidad-errores',
		redirectTo: 'admin/monitoreo/incidencias/errores',
		pathMatch: 'full',
	},
	{
		path: 'admin/reportes-usuario',
		redirectTo: 'admin/monitoreo/incidencias/reportes',
		pathMatch: 'full',
	},
	{
		path: 'admin/rate-limit-events',
		redirectTo: 'admin/monitoreo/seguridad/rate-limit',
		pathMatch: 'full',
	},
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
			{
				// Panel de ayuda (xrepo-panel-ayuda-intranet F4) — visible a todo usuario
				// logueado, sin gate de capability propio: el `permissionPath` apunta al
				// mismo path que Home ('intranet'), que la capability genérica `INTRANET`
				// ya concede a todos los roles. Ver brief 479 § DECISIONES YA TOMADAS.
				path: 'ayuda',
				loadComponent: () =>
					import('./pages/cross-role/ayuda/ayuda-shell.component').then(
						(m) => m.AyudaShellComponent,
					),
				loadChildren: () => import('./pages/cross-role/ayuda/ayuda.routes').then((m) => m.default),
				data: { permissionPath: 'intranet' },
				title: 'Intranet - Ayuda',
			},
			// #endregion

			// #region Por rol (profesor / estudiante)
			...roleFeatureRoutes,
			// #endregion

			// #region Admin
			...experimentalRoutes,
			{
				// P92 F2 (brief 499) — gate de selección de usuario para "ver como".
				// `permissionPath: 'intranet'` reusa la capability genérica ya
				// concedida a todo rol logueado (mismo truco que la ruta 'ayuda',
				// ver comentario más abajo) — el gate real de "quién puede ver como
				// quién" vive en el backend (`ADMIN_VER_COMO`, F1 brief 498), esta
				// ruta solo redirige a quien no sea Administrador (ver
				// `ViewAsGateComponent.ngOnInit`).
				path: 'ver-como/:rol',
				loadComponent: () =>
					import('./pages/admin/view-as-gate').then((m) => m.ViewAsGateComponent),
				data: { permissionPath: 'intranet' },
				title: 'Intranet - Ver como',
			},
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
				// Panel de ayuda — administración de FAQ (xrepo-panel-ayuda-intranet F7b,
				// brief 483). Ruta debe coincidir con la capability `AYUDA_MANAGE`
				// seed en `Educa.API/Migrations/Manual/20260724_CreateFaqWizardTables.sql`
				// ('intranet/admin/ayuda/faq').
				path: 'admin/ayuda/faq',
				loadComponent: () =>
					import('./pages/admin/ayuda-faq').then((m) => m.AyudaFaqAdminComponent),
				title: 'Intranet - Ayuda: Gestión de FAQ',
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
				// P91 F2 (brief 495) — gateado por `ADMIN_RENDIMIENTO` (capability de página,
				// separada de `REPORTES_RENDIMIENTO` que valida el endpoint). Ver
				// `intranet-menu.config.ts` y migración manual `20260727_AddAdminRendimientoCapability.sql`.
				path: 'admin/rendimiento',
				loadComponent: () =>
					import('./pages/admin/admin-rendimiento').then((m) => m.AdminRendimientoComponent),
				title: 'Intranet - Rendimiento Institucional',
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
				path: 'admin/registro-vistas',
				redirectTo: 'admin/permisos/roles',
				pathMatch: 'full' as const,
			},
			// xrepo-panel-ayuda-intranet F7b — bandeja de tickets + catálogo de tipos,
			// contraparte admin de la sección Ticket pública (F5, `intranet/ayuda`).
			// Ruta única (tabs por queryParam, mismo patrón que `admin/asistencias`):
			// la capability `AYUDA_TICKET_MANAGE` tiene una sola `CAP_Ruta` seedeada
			// (`intranet/admin/ayuda/tickets`) contra la que hace match exacto el
			// `permissionsGuard` — 2 rutas hijas hubieran requerido 2 capabilities,
			// fuera de alcance (F7a reusa la misma capability a propósito).
			{
				path: 'admin/ayuda/tickets',
				loadComponent: () =>
					import('./pages/admin/ayuda-tickets/ticket-admin/ticket-admin.component').then(
						(m) => m.TicketAdminComponent,
					),
				title: 'Intranet - Administración de Tickets',
			},
			// Plan 35 — Submódulo "Monitoreo" reagrupado en hub + 3 dominios.
			// Las 7 rutas viejas (email-outbox, trazabilidad-errores, reportes-usuario,
			// rate-limit-events, auditoria-correos, dashboard-dia, diagnostico) viven ahora
			// dentro de `admin/monitoreo` con shells. Los redirects abajo conservan URLs viejas.
			{
				path: 'admin/monitoreo',
				loadChildren: () =>
					import('./pages/admin/monitoreo/monitoreo.routes').then((m) => m.default),
			},
			...MONITOREO_LEGACY_REDIRECTS,
			{
				// Plan 32 Chat 4 — Hub central que cruza los 4 tipos de telemetría que
				// comparten un correlation id. Deep-link only (sin entrada de menú).
				// Reusa el permiso de error-logs vía data.permissionPath porque la ruta
				// con :id nunca matchea exact en vistasPermitidas.
				path: 'admin/correlation/:id',
				loadComponent: () =>
					import('./pages/admin/correlation').then((m) => m.CorrelationComponent),
				data: { permissionPath: 'intranet/admin/monitoreo/incidencias/errores' },
				title: 'Intranet - Eventos correlacionados',
			},
			// #endregion
		],
	},
];
