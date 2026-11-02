// #region Imports
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { PageHeaderComponent } from '@intranet-shared/components';
import { EduTab, EduTabs } from '@edu-ui';
// #endregion

interface ShellTab {
	value: 'panel';
	label: string;
	icon: string;
}

const TABS: ShellTab[] = [{ value: 'panel', label: 'Panel de cobranza', icon: 'pi pi-chart-pie' }];

/**
 * Shell del módulo Pagos: rutas hijas reales por pestaña (mismo patrón que `AttendancesShellComponent`).
 * Todas heredan `permissionPath: 'intranet/admin/pagos'` desde `intranet.routes.ts`.
 */
@Component({
	selector: 'app-pagos-shell',
	standalone: true,
	imports: [RouterOutlet, EduTab, EduTabs, PageHeaderComponent],
	templateUrl: './pagos-shell.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagosShellComponent {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);

	readonly tabs = TABS;

	readonly activeTab = toSignal(
		this.router.events.pipe(
			filter((e) => e instanceof NavigationEnd),
			map(() => this.resolveActiveTab()),
		),
		{ initialValue: this.resolveActiveTab() },
	);

	onTabChange(value: string | number | undefined): void {
		if (value === undefined) return;
		void this.router.navigate([String(value)], { relativeTo: this.route });
	}

	private resolveActiveTab(): string {
		return this.route.firstChild?.snapshot?.url?.[0]?.path ?? 'panel';
	}
}
