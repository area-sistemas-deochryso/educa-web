// #region Imports
import { Route, Routes } from '@angular/router';

import { authGuard, permissionsGuard } from '@core/guards';
import { environment } from '@config/environment';

import { DomainId } from './models/monitoreo-hub-badges.models';
import { DOMAINS } from './monitoreo-hub.catalog';
// #endregion

// #region Route config per tab slug
interface TabRouteConfig {
	loadComponent: Route['loadComponent'];
	title: string;
}

const CORREOS_TAB_ROUTES: Record<string, TabRouteConfig> = {
	bandeja: {
		loadComponent: () =>
			import('../email-outbox').then((m) => m.EmailOutboxComponent),
		title: 'Intranet - Bandeja de Correos',
	},
	dashboard: {
		loadComponent: () =>
			import('../email-outbox-dashboard-dia').then(
				(m) => m.EmailOutboxDashboardDiaComponent,
			),
		title: 'Intranet - Dashboard de Correos',
	},
	diagnostico: {
		loadComponent: () =>
			import('../email-outbox-diagnostico').then(
				(m) => m.EmailOutboxDiagnosticoComponent,
			),
		title: 'Intranet - Diagnóstico de Correos',
	},
	auditoria: {
		loadComponent: () =>
			import('../auditoria-correos').then((m) => m.AuditoriaCorreosComponent),
		title: 'Intranet - Auditoría de Correos',
	},
	blacklist: {
		loadComponent: () =>
			import('../email-outbox/components/blacklist-tab/blacklist-tab.component').then(
				(m) => m.BlacklistTabComponent,
			),
		title: 'Intranet - Blacklist de Correos',
	},
	quarantine: {
		loadComponent: () =>
			import(
				'../email-outbox/components/quarantine-tab/quarantine-tab.component'
			).then((m) => m.QuarantineTabComponent),
		title: 'Intranet - Cuarentena de Correos',
	},
	'domain-pauses': {
		loadComponent: () =>
			import(
				'../email-outbox/components/domain-pauses-tab/domain-pauses-tab.component'
			).then((m) => m.DomainPausesTabComponent),
		title: 'Intranet - Dominios Pausados',
	},
	'defer-events': {
		loadComponent: () =>
			import(
				'../email-outbox/components/defer-events-tab/defer-events-tab.component'
			).then((m) => m.DeferEventsTabComponent),
		title: 'Intranet - Eventos Defer',
	},
};

const INCIDENCIAS_TAB_ROUTES: Record<string, TabRouteConfig> = {
	errores: {
		loadComponent: () =>
			import('../error-groups').then((m) => m.ErrorGroupsComponent),
		title: 'Intranet - Trazabilidad de Errores',
	},
	reportes: {
		loadComponent: () =>
			import('../feedback-reports').then((m) => m.FeedbackReportsComponent),
		title: 'Intranet - Reportes de Usuarios',
	},
};
// #endregion

// #region Builder — genera children desde catálogo + route configs
function buildDomainChildren(
	domainId: DomainId,
	tabRoutes: Record<string, TabRouteConfig>,
): Routes {
	const domain = DOMAINS.find((d) => d.id === domainId);
	if (!domain) return [];

	const firstSlug = domain.tiles[0]?.route.split('/').pop() ?? '';
	const children: Routes = [
		{ path: '', redirectTo: firstSlug, pathMatch: 'full' },
	];

	for (const tile of domain.tiles) {
		if (tile.featureFlag && !environment.features[tile.featureFlag]) continue;

		const slug = tile.route.split('/').pop() ?? '';
		const config = tabRoutes[slug];
		if (!config) continue;

		children.push({
			path: slug,
			loadComponent: config.loadComponent,
			canActivate: [authGuard, permissionsGuard],
			data: { permissionPath: `intranet/admin/monitoreo/${domainId}/${slug}` },
			title: config.title,
		});
	}

	return children;
}
// #endregion

// #region Routes
export default [
	{
		path: '',
		loadComponent: () =>
			import('./monitoreo-hub.component').then((m) => m.MonitoreoHubComponent),
		title: 'Intranet - Monitoreo',
	},
	...(environment.features.emailRecipientView
		? [
				{
					path: 'correos/persona/:correo',
					loadComponent: () =>
						import('../recipient-view').then((m) => m.RecipientViewComponent),
					canActivate: [authGuard, permissionsGuard],
					data: { permissionPath: 'intranet/admin/monitoreo/correos/persona' },
					title: 'Intranet - Vista de Destinatario',
				},
			]
		: []),
	{
		path: 'correos/estudiante/:id',
		loadComponent: () =>
			import('../student-gap-profile').then((m) => m.StudentGapProfileComponent),
		canActivate: [authGuard, permissionsGuard],
		data: { permissionPath: 'intranet/admin/monitoreo/correos/dashboard' },
		title: 'Intranet - Perfil Estudiante (Gap)',
	},
	{
		path: 'correos',
		loadComponent: () =>
			import('./shells/monitoreo-shell.component').then(
				(m) => m.MonitoreoShellComponent,
			),
		data: { domainId: 'correos' as DomainId, permissionPath: 'intranet/admin/monitoreo' },
		children: buildDomainChildren('correos', CORREOS_TAB_ROUTES),
	},
	{
		path: 'incidencias',
		loadComponent: () =>
			import('./shells/monitoreo-shell.component').then(
				(m) => m.MonitoreoShellComponent,
			),
		data: { domainId: 'incidencias' as DomainId, permissionPath: 'intranet/admin/monitoreo' },
		children: buildDomainChildren('incidencias', INCIDENCIAS_TAB_ROUTES),
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
