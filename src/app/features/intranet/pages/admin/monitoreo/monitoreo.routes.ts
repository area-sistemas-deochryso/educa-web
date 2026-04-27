// #region Imports
import { Routes } from '@angular/router';

import { authGuard, permissionsGuard } from '@core/guards';
import { environment } from '@config/environment';
// #endregion

// #region Children — Correos shell (4 tabs)
const CORREOS_CHILDREN: Routes = [
	{ path: '', redirectTo: 'bandeja', pathMatch: 'full' },
	{
		path: 'bandeja',
		loadComponent: () =>
			import('../email-outbox').then((m) => m.EmailOutboxComponent),
		canActivate: [authGuard, permissionsGuard],
		data: { permissionPath: 'intranet/admin/monitoreo/correos/bandeja' },
		title: 'Intranet - Bandeja de Correos',
	},
	...(environment.features.emailOutboxDashboardDia
		? [
				{
					path: 'dashboard',
					loadComponent: () =>
						import('../email-outbox-dashboard-dia').then(
							(m) => m.EmailOutboxDashboardDiaComponent,
						),
					canActivate: [authGuard, permissionsGuard],
					data: { permissionPath: 'intranet/admin/monitoreo/correos/dashboard' },
					title: 'Intranet - Dashboard de Correos',
				},
			]
		: []),
	...(environment.features.emailOutboxDiagnostico
		? [
				{
					path: 'diagnostico',
					loadComponent: () =>
						import('../email-outbox-diagnostico').then(
							(m) => m.EmailOutboxDiagnosticoComponent,
						),
					canActivate: [authGuard, permissionsGuard],
					data: { permissionPath: 'intranet/admin/monitoreo/correos/diagnostico' },
					title: 'Intranet - Diagnóstico de Correos',
				},
			]
		: []),
	...(environment.features.auditoriaCorreos
		? [
				{
					path: 'auditoria',
					loadComponent: () =>
						import('../auditoria-correos').then((m) => m.AuditoriaCorreosComponent),
					canActivate: [authGuard, permissionsGuard],
					data: { permissionPath: 'intranet/admin/monitoreo/correos/auditoria' },
					title: 'Intranet - Auditoría de Correos',
				},
			]
		: []),
];
// #endregion

// #region Children — Incidencias shell (2 tabs)
const INCIDENCIAS_CHILDREN: Routes = [
	{ path: '', redirectTo: 'errores', pathMatch: 'full' },
	{
		path: 'errores',
		loadComponent: () =>
			import('../error-groups').then((m) => m.ErrorGroupsComponent),
		canActivate: [authGuard, permissionsGuard],
		data: { permissionPath: 'intranet/admin/monitoreo/incidencias/errores' },
		title: 'Intranet - Trazabilidad de Errores',
	},
	{
		path: 'reportes',
		loadComponent: () =>
			import('../feedback-reports').then((m) => m.FeedbackReportsComponent),
		canActivate: [authGuard, permissionsGuard],
		data: { permissionPath: 'intranet/admin/monitoreo/incidencias/reportes' },
		title: 'Intranet - Reportes de Usuarios',
	},
];
// #endregion

// #region Routes
export default [
	{
		path: '',
		loadComponent: () =>
			import('./monitoreo-hub.component').then((m) => m.MonitoreoHubComponent),
		title: 'Intranet - Monitoreo',
	},
	{
		path: 'correos',
		loadComponent: () =>
			import('./shells/correos-shell.component').then((m) => m.CorreosShellComponent),
		children: CORREOS_CHILDREN,
	},
	{
		path: 'incidencias',
		loadComponent: () =>
			import('./shells/incidencias-shell.component').then(
				(m) => m.IncidenciasShellComponent,
			),
		children: INCIDENCIAS_CHILDREN,
	},
	...(environment.features.rateLimitMonitoring
		? [
				{
					path: 'seguridad/rate-limit',
					loadComponent: () =>
						import('../rate-limit-events').then((m) => m.RateLimitEventsComponent),
					canActivate: [authGuard, permissionsGuard],
					data: { permissionPath: 'intranet/admin/monitoreo/seguridad/rate-limit' },
					title: 'Intranet - Telemetría de Rate Limiting',
				},
			]
		: []),
] satisfies Routes;
// #endregion
