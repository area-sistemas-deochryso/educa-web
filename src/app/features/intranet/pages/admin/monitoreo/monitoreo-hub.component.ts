// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@intranet-shared/components/page-header/page-header.component';
import { UserPermissionsService } from '@core/services';
import { PERMISOS, PermisoPath } from '@shared/constants';
import { environment } from '@config/environment';
import { EmailMonitoreoFacade } from '../email-outbox-dashboard-dia/services';
import { EmailDeferFailBannerComponent } from '../email-outbox-dashboard-dia/components/email-defer-fail-banner/email-defer-fail-banner.component';
import { MonitoreoHubBadgesFacade } from './services/monitoreo-hub-badges.facade';
import {
	BadgeLevel,
	CardSummary,
	HubBadgeKey,
	HubExtras,
	LinkBadge,
	UNKNOWN_BADGE,
} from './models/monitoreo-hub-badges.models';
// #endregion

// #region Types
type FeatureFlagKey = keyof typeof environment.features;

interface MonitoreoLink {
	label: string;
	route: string;
	permiso: PermisoPath;
	featureFlag?: FeatureFlagKey;
	/** Asocia el link con una métrica del badge. Si falta, no se muestra badge. */
	badgeKey?: HubBadgeKey;
}

type MonitoreoTone = 'blue' | 'amber' | 'green';

type MonitoreoCardId =
	| 'correos-operacion'
	| 'correos-investigacion'
	| 'correos-defensas'
	| 'incidencias'
	| 'seguridad';

interface MonitoreoCard {
	id: MonitoreoCardId;
	icon: string;
	title: string;
	description: string;
	tone: MonitoreoTone;
	links: MonitoreoLink[];
}

interface RenderedLink extends MonitoreoLink {
	badge: LinkBadge | null;
}

interface RenderedCard extends Omit<MonitoreoCard, 'links'> {
	links: RenderedLink[];
	summary: CardSummary | null;
}
// #endregion

// #region Catálogo declarativo
const ALL_CARDS: MonitoreoCard[] = [
	{
		id: 'correos-operacion',
		icon: 'pi pi-envelope',
		title: 'Correos · Operación',
		description: 'Qué pasó hoy con el envío de correos.',
		tone: 'blue',
		links: [
			{
				label: 'Bandeja',
				route: '/intranet/admin/monitoreo/correos/bandeja',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX,
				badgeKey: 'bandeja',
			},
			{
				label: 'Dashboard del día',
				route: '/intranet/admin/monitoreo/correos/dashboard',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX_DASHBOARD_DIA,
				featureFlag: 'emailOutboxDashboardDia',
				badgeKey: 'dashboard',
			},
		],
	},
	{
		id: 'correos-investigacion',
		icon: 'pi pi-search',
		title: 'Correos · Investigación',
		description: 'Análisis post-mortem y forense del canal SMTP.',
		tone: 'blue',
		links: [
			{
				label: 'Diagnóstico',
				route: '/intranet/admin/monitoreo/correos/diagnostico',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX_DIAGNOSTICO,
				featureFlag: 'emailOutboxDiagnostico',
				badgeKey: 'diagnostico',
			},
			{
				label: 'Auditoría',
				route: '/intranet/admin/monitoreo/correos/auditoria',
				permiso: PERMISOS.ADMIN_AUDITORIA_CORREOS,
				featureFlag: 'auditoriaCorreos',
			},
			{
				label: 'Eventos defer',
				route: '/intranet/admin/monitoreo/correos/defer-events',
				permiso: PERMISOS.ADMIN_EMAIL_DEFER_EVENTS,
				featureFlag: 'emailDeferEventsTab',
			},
		],
	},
	{
		id: 'correos-defensas',
		icon: 'pi pi-shield',
		title: 'Correos · Defensas',
		description: 'Destinatarios y dominios bloqueados o pausados.',
		tone: 'blue',
		links: [
			{
				label: 'Blacklist',
				route: '/intranet/admin/monitoreo/correos/blacklist',
				permiso: PERMISOS.ADMIN_EMAIL_BLACKLIST,
				featureFlag: 'emailBlacklistTab',
				badgeKey: 'blacklist',
			},
			{
				label: 'Cuarentena',
				route: '/intranet/admin/monitoreo/correos/quarantine',
				permiso: PERMISOS.ADMIN_EMAIL_QUARANTINE,
				featureFlag: 'emailQuarantineTab',
			},
			{
				label: 'Dominios pausados',
				route: '/intranet/admin/monitoreo/correos/domain-pauses',
				permiso: PERMISOS.ADMIN_EMAIL_DOMAIN_PAUSES,
				featureFlag: 'emailDomainPausesTab',
			},
		],
	},
	{
		id: 'incidencias',
		icon: 'pi pi-megaphone',
		title: 'Incidencias',
		description: 'Errores con contexto y reportes manuales de usuarios.',
		tone: 'amber',
		links: [
			{
				label: 'Errores',
				route: '/intranet/admin/monitoreo/incidencias/errores',
				permiso: PERMISOS.ADMIN_ERROR_LOGS,
				badgeKey: 'errores',
			},
			{
				label: 'Reportes de Usuarios',
				route: '/intranet/admin/monitoreo/incidencias/reportes',
				permiso: PERMISOS.ADMIN_REPORTES_USUARIO,
				badgeKey: 'reportes',
			},
		],
	},
	{
		id: 'seguridad',
		icon: 'pi pi-shield',
		title: 'Seguridad',
		description: 'Saturación, abuso y respuestas 429 del rate limiter.',
		tone: 'green',
		links: [
			{
				label: 'Rate Limit',
				route: '/intranet/admin/monitoreo/seguridad/rate-limit',
				permiso: PERMISOS.ADMIN_RATE_LIMIT_EVENTS,
				featureFlag: 'rateLimitMonitoring',
				badgeKey: 'rateLimit',
			},
		],
	},
];
// #endregion

@Component({
	selector: 'app-monitoreo-hub',
	standalone: true,
	imports: [RouterLink, PageHeaderComponent, EmailDeferFailBannerComponent],
	templateUrl: './monitoreo-hub.component.html',
	styleUrl: './monitoreo-hub.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoreoHubComponent {
	// #region Dependencies
	private readonly userPermisos = inject(UserPermissionsService);
	private readonly emailMonitoreo = inject(EmailMonitoreoFacade);
	private readonly badgesFacade = inject(MonitoreoHubBadgesFacade);
	// #endregion

	// #region Defer/Fail badge — Plan 39 Chat C
	readonly deferFailCritical = computed(() => {
		const status = this.emailMonitoreo.vm().deferFailStatus;
		if (!status) return false;
		return status.currentHour.deferFailCount >= 4;
	});

	readonly deferFailLevel = computed(() => this.emailMonitoreo.vm().deferFailStatus?.status ?? 'OK');
	// #endregion

	// #region Badges vivos por sub-link
	readonly badgesLoading = this.badgesFacade.loading;
	// #endregion

	constructor() {
		this.emailMonitoreo.loadDeferFailStatus();
		void this.badgesFacade.loadAll();
	}

	// #region Cards visibles (filtradas por permiso + feature flag) con badges + summary
	readonly cards = computed<RenderedCard[]>(() => {
		// Touch the signal to make this reactive when permissions load.
		this.userPermisos.loaded();
		const badges = this.badgesFacade.badges();
		const extras = this.badgesFacade.extras();

		return ALL_CARDS.map((card) => ({
			...card,
			links: card.links
				.filter((link) => this.linkVisible(link))
				.map<RenderedLink>((link) => ({
					...link,
					badge: link.badgeKey ? badges[link.badgeKey] : null,
				})),
			summary: this.buildSummary(card.id, extras),
		})).filter((card) => card.links.length > 0);
	});

	readonly hasAnyCard = computed(() => this.cards().length > 0);
	// #endregion

	// #region Builders de summary por card
	private buildSummary(id: MonitoreoCardId, x: HubExtras): CardSummary | null {
		switch (id) {
			case 'correos-operacion': {
				if (!x.outbox) return null;
				const pendFall = x.outbox.pendientes + x.outbox.fallidos;
				return {
					headline: pendFall,
					headlineLabel: 'pendientes o fallidos hoy',
					headlineLevel: pendFall > 20 ? 'critical' : pendFall >= 5 ? 'warn' : 'ok',
					stats: [
						{ label: 'Enviados', value: x.outbox.enviados, level: 'ok' },
						{ label: 'Pendientes', value: x.outbox.pendientes, level: x.outbox.pendientes > 0 ? 'warn' : 'ok' },
						{ label: 'Fallidos', value: x.outbox.fallidos, level: x.outbox.fallidos > 0 ? 'critical' : 'ok' },
					],
				};
			}
			case 'correos-investigacion': {
				if (!x.deferFail) return null;
				const pct = Math.round(x.deferFail.percentUsed);
				return {
					headline: `${pct}%`,
					headlineLabel: `del techo cPanel (${x.deferFail.current}/${x.deferFail.threshold} h)`,
					headlineLevel: pct >= 100 ? 'critical' : pct >= 60 ? 'warn' : 'ok',
					stats: [
						{
							label: 'Candidatos',
							value: x.candidatosBlacklist ?? '—',
							level: (x.candidatosBlacklist ?? 0) >= 3 ? 'critical' : (x.candidatosBlacklist ?? 0) >= 1 ? 'warn' : 'ok',
						},
						{ label: 'Fallidos 24h', value: x.deferFail.last24hFailedOther, level: x.deferFail.last24hFailedOther > 0 ? 'warn' : 'ok' },
					],
				};
			}
			case 'correos-defensas': {
				if (!x.deferFail) return null;
				const total = x.deferFail.blacklistActivos;
				return {
					headline: total,
					headlineLabel: 'destinatarios bloqueados',
					headlineLevel: total >= 50 ? 'critical' : total >= 10 ? 'warn' : 'ok',
					stats: [],
				};
			}
			case 'incidencias': {
				if (x.errorsNuevos === null && x.reportesNuevos === null) return null;
				const errs = x.errorsNuevos ?? 0;
				const reps = x.reportesNuevos ?? 0;
				return {
					headline: errs + reps,
					headlineLabel: 'incidencias requieren atención',
					headlineLevel: errs + reps >= 5 ? 'critical' : errs + reps >= 1 ? 'warn' : 'ok',
					stats: [
						{ label: 'Errores nuevos', value: errs, level: errs >= 3 ? 'critical' : errs >= 1 ? 'warn' : 'ok' },
						{ label: 'Reportes nuevos', value: reps, level: reps >= 4 ? 'critical' : reps >= 1 ? 'warn' : 'ok' },
						{ label: 'En progreso', value: x.reportesEnProgreso ?? 0 },
					],
				};
			}
			case 'seguridad': {
				if (x.rateLimitRechazados === null) return null;
				const total = x.rateLimitRechazados;
				const level: BadgeLevel = total > 10 ? 'critical' : total >= 1 ? 'warn' : 'ok';
				return {
					headline: total,
					headlineLabel: 'rechazos en última hora',
					headlineLevel: level,
					stats: [],
				};
			}
		}
	}
	// #endregion

	// #region Acciones
	refreshBadges(): void {
		void this.badgesFacade.refresh();
	}
	// #endregion

	// #region Helpers
	private linkVisible(link: MonitoreoLink): boolean {
		if (link.featureFlag && !environment.features[link.featureFlag]) return false;
		return this.userPermisos.tienePermiso(link.permiso);
	}

	hasBadge(badge: LinkBadge | null): badge is LinkBadge {
		return !!badge && badge !== UNKNOWN_BADGE;
	}
	// #endregion
}
