// #region Imports
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { PageHeaderComponent } from '@intranet-shared/components';
import { AttendanceScopeBannerComponent } from '@intranet-shared/components/attendance-scope-banner';
import { EduTab, EduTabs } from '@edu-ui';
// #endregion

interface ShellTab {
	value: 'gestion' | 'reportes' | 'panel';
	label: string;
	icon: string;
}

const TABS: ShellTab[] = [
	{ value: 'gestion', label: 'Editar registros', icon: 'pi pi-cog' },
	{ value: 'reportes', label: 'Reportes', icon: 'pi pi-chart-bar' },
	{ value: 'panel', label: 'Panel', icon: 'pi pi-th-large' },
];

/**
 * Shell de las 3 vistas admin de Asistencias (gestión + reportes + panel), ahora rutas
 * hijas reales (`gestion`/`reportes`/`panel`) en vez de tabs por queryParam — mismo patrón
 * que `TicketAdminShellComponent` (`.claude/reference/route-permission-sharing.md`).
 * Todas heredan `permissionPath: 'intranet/admin/asistencias'` desde `intranet.routes.ts`.
 */
@Component({
	selector: 'app-attendances-shell',
	standalone: true,
	imports: [RouterOutlet, EduTab, EduTabs, PageHeaderComponent, AttendanceScopeBannerComponent],
	templateUrl: './attendances-shell.component.html',
	styleUrl: './attendances-shell.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancesShellComponent {
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
		return this.route.firstChild?.snapshot?.url?.[0]?.path ?? 'gestion';
	}
}
