// #region Imports
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { PageHeaderComponent } from '@intranet-shared/components/page-header/page-header.component';
import { UserPermissionsService } from '@core/services';
import { environment } from '@config/environment';
import { EmailMonitoreoFacade } from '../email-outbox-dashboard-dia/services';
import { EmailDeferFailBannerComponent } from '../email-outbox-dashboard-dia/components/email-defer-fail-banner/email-defer-fail-banner.component';
import { MonitoreoHubBadgesFacade } from './services/monitoreo-hub-badges.facade';
import {
	DomainId,
	DomainTone,
	LinkBadge,
} from './models/monitoreo-hub-badges.models';
import { DOMAINS, DomainTile } from './monitoreo-hub.catalog';
import {
	DomainHeadline,
	DomainStat,
	buildHeadline,
	buildStats,
} from './monitoreo-hub.summary';
// #endregion

// #region Types — locales del componente
const LEVEL_ORDER: Record<string, number> = { critical: 0, warn: 1, ok: 2, unknown: 3 };

interface HubQueryParams {
	from: 'hub';
	level?: string;
}

interface RenderedTile extends DomainTile {
	badge: LinkBadge | null;
	hubParams: HubQueryParams;
}

interface RenderedDomain {
	id: DomainId;
	label: string;
	icon: string;
	description: string;
	tone: DomainTone;
	tiles: RenderedTile[];
	headline: DomainHeadline | null;
	stats: DomainStat[];
	hasAlert: boolean;
	alertCount: number;
}

interface TriageItem {
	label: string;
	route: string;
	icon: string;
	badge: LinkBadge;
	domainTone: DomainTone;
	hubParams: HubQueryParams;
}
// #endregion

@Component({
	selector: 'app-monitoreo-hub',
	standalone: true,
	imports: [
		RouterLink,
		TabsModule,
		TagModule,
		TooltipModule,
		PageHeaderComponent,
		EmailDeferFailBannerComponent,
	],
	templateUrl: './monitoreo-hub.component.html',
	styleUrl: './monitoreo-hub.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoreoHubComponent {
	// #region Dependencies
	private readonly userPermisos = inject(UserPermissionsService);
	private readonly emailMonitoreo = inject(EmailMonitoreoFacade);
	private readonly badgesFacade = inject(MonitoreoHubBadgesFacade);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado del tab activo
	readonly activeDomain = signal<DomainId>('correos');
	readonly badgesLoading = this.badgesFacade.loading;
	// #endregion

	// #region Refresh timestamp
	private readonly _now = signal(Date.now());
	readonly lastRefreshAt = signal(Date.now());

	readonly timeSinceRefresh = computed(() => {
		const diff = this._now() - this.lastRefreshAt();
		const minutes = Math.floor(diff / 60_000);
		if (minutes < 1) return 'ahora';
		if (minutes < 60) return `${minutes}m`;
		return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
	});
	// #endregion

	constructor() {
		this.emailMonitoreo.loadDeferFailStatus();
		void this.badgesFacade.loadAll();

		const intervalId = setInterval(() => this._now.set(Date.now()), 30_000);
		this.destroyRef.onDestroy(() => clearInterval(intervalId));
	}

	// #region Domains visibles con badges + headline + stats
	readonly domains = computed<RenderedDomain[]>(() => {
		this.userPermisos.loaded();
		const badges = this.badgesFacade.badges();
		const extras = this.badgesFacade.extras();

		return DOMAINS.map((domain) => {
			const tiles = domain.tiles
				.filter((t) => this.tileVisible(t))
				.map<RenderedTile>((t) => {
					const badge = t.badgeKey ? badges[t.badgeKey] : null;
					const hubParams: HubQueryParams = { from: 'hub' };
					if (badge?.level && badge.level !== 'ok' && badge.level !== 'unknown') {
						hubParams.level = badge.level;
					}
					return { ...t, badge, hubParams };
				})
				.sort((a, b) =>
					(LEVEL_ORDER[a.badge?.level ?? 'unknown'] ?? 3) -
					(LEVEL_ORDER[b.badge?.level ?? 'unknown'] ?? 3),
				);
			const alertCount = tiles.filter(
				(t) => t.badge?.level === 'critical' || t.badge?.level === 'warn',
			).length;

			return {
				id: domain.id,
				label: domain.label,
				icon: domain.icon,
				description: domain.description,
				tone: domain.tone,
				tiles,
				headline: buildHeadline(domain.id, extras),
				stats: buildStats(domain.id, extras),
				hasAlert: alertCount > 0,
				alertCount,
			};
		}).filter((d) => d.tiles.length > 0);
	});

	readonly hasAnyDomain = computed(() => this.domains().length > 0);

	readonly triageItems = computed<TriageItem[]>(() =>
		this.domains().flatMap((d) =>
			d.tiles
				.filter((t) => t.badge?.level === 'critical' || t.badge?.level === 'warn')
				.map((t) => ({
					label: t.label,
					route: t.route,
					icon: t.icon,
					badge: t.badge!,
					domainTone: d.tone,
					hubParams: t.hubParams,
				})),
		),
	);

	readonly allOk = computed(() => !this.badgesLoading() && this.triageItems().length === 0);
	// #endregion

	// #region Acciones
	refreshBadges(): void {
		void this.badgesFacade.refresh();
		this.lastRefreshAt.set(Date.now());
	}

	setActiveDomain(value: string | number | undefined): void {
		if (value === undefined) return;
		this.activeDomain.set(String(value) as DomainId);
	}
	// #endregion

	// #region Helpers
	private tileVisible(tile: DomainTile): boolean {
		if (tile.featureFlag && !environment.features[tile.featureFlag]) return false;
		return this.userPermisos.hasCapability(tile.capability);
	}
	// #endregion
}
