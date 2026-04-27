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
// #endregion

// #region Types
interface ShellTab {
	value: string;
	label: string;
	icon: string;
}
// #endregion

// #region Tabs declarativos
const ALL_TABS: ShellTab[] = [
	{ value: 'errores', label: 'Errores', icon: 'pi pi-exclamation-triangle' },
	{ value: 'reportes', label: 'Reportes de Usuarios', icon: 'pi pi-megaphone' },
];
// #endregion

@Component({
	selector: 'app-incidencias-shell',
	standalone: true,
	imports: [RouterOutlet, TabsModule],
	templateUrl: './incidencias-shell.component.html',
	styleUrl: './shells.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidenciasShellComponent {
	// #region Dependencies
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	// #endregion

	// #region Tabs (sin feature flags en este shell)
	readonly tabs = computed<ShellTab[]>(() => ALL_TABS);

	private readonly initialTab = this.resolveActiveTab();

	readonly activeTab = toSignal(
		this.router.events.pipe(
			filter((e) => e instanceof NavigationEnd),
			map(() => this.resolveActiveTab()),
		),
		{ initialValue: this.initialTab },
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
		const segment = this.route.firstChild?.snapshot.url[0]?.path;
		return segment ?? ALL_TABS[0].value;
	}
	// #endregion
}
