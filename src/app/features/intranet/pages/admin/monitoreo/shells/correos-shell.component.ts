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
// #endregion

// #region Types
type FeatureFlagKey = keyof typeof environment.features;

interface ShellTab {
	value: string;
	label: string;
	icon: string;
	featureFlag?: FeatureFlagKey;
}
// #endregion

// #region Tabs declarativos
const ALL_TABS: ShellTab[] = [
	{ value: 'bandeja', label: 'Bandeja', icon: 'pi pi-inbox' },
	{
		value: 'dashboard',
		label: 'Dashboard del día',
		icon: 'pi pi-chart-bar',
		featureFlag: 'emailOutboxDashboardDia',
	},
	{
		value: 'diagnostico',
		label: 'Diagnóstico',
		icon: 'pi pi-search',
		featureFlag: 'emailOutboxDiagnostico',
	},
	{
		value: 'auditoria',
		label: 'Auditoría',
		icon: 'pi pi-exclamation-triangle',
		featureFlag: 'auditoriaCorreos',
	},
];
// #endregion

@Component({
	selector: 'app-correos-shell',
	standalone: true,
	imports: [RouterOutlet, TabsModule],
	templateUrl: './correos-shell.component.html',
	styleUrl: './shells.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreosShellComponent {
	// #region Dependencies
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	// #endregion

	// #region Tabs visibles (filtrado por feature flag)
	readonly tabs = computed<ShellTab[]>(() =>
		ALL_TABS.filter((t) => !t.featureFlag || environment.features[t.featureFlag]),
	);

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
		return segment ?? ALL_TABS[0].value;
	}
	// #endregion
}
