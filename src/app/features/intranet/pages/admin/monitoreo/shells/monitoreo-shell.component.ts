// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
	ActivatedRoute,
	NavigationEnd,
	Router,
	RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { TabsModule } from 'primeng/tabs';

import { environment } from '@config/environment';

import { DomainId } from '../models/monitoreo-hub-badges.models';
import { DOMAINS } from '../monitoreo-hub.catalog';
// #endregion

// #region Tab derivada del catálogo
interface ShellTab {
	value: string;
	label: string;
	icon: string;
}
// #endregion

@Component({
	selector: 'app-monitoreo-shell',
	standalone: true,
	imports: [RouterOutlet, TabsModule],
	templateUrl: './monitoreo-shell.component.html',
	styleUrl: './shells.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoreoShellComponent {
	// #region Dependencies
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	// #endregion

	// #region Domain ID from route data
	private readonly domainId = this.route.snapshot.data['domainId'] as DomainId;
	// #endregion

	// #region Tabs derivadas del catálogo (SSOT)
	readonly tabs = computed<ShellTab[]>(() => {
		const domain = DOMAINS.find((d) => d.id === this.domainId);
		if (!domain) return [];

		return domain.tiles
			.filter((t) => !t.featureFlag || environment.features[t.featureFlag])
			.map((t) => ({
				value: this.extractTabSlug(t.route),
				label: t.label,
				icon: t.icon,
			}));
	});

	readonly activeTab = toSignal(
		this.router.events.pipe(
			filter((e) => e instanceof NavigationEnd),
			map(() => this.resolveActiveTab()),
		),
		{ initialValue: this.resolveActiveTab() },
	);
	// #endregion

	// #region Handlers
	onTabChange(value: string | number | undefined): void {
		if (value === undefined) return;
		void this.router.navigate([String(value)], { relativeTo: this.route });
	}
	// #endregion

	// #region Helpers
	private resolveActiveTab(): string {
		const segment = this.route.firstChild?.snapshot?.url?.[0]?.path;
		const firstTab = this.tabs()[0]?.value ?? '';
		return segment ?? firstTab;
	}

	private extractTabSlug(route: string): string {
		return route.split('/').pop() ?? '';
	}
	// #endregion
}
