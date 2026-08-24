// #region Imports
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { EduTab, EduTabs } from '@edu-ui';

// #endregion

// #region EduTabs del shell (fijas — QA implementada, Ticket/Salud de sede son placeholders hasta F5/F6)
interface ShellTab {
	value: string;
	label: string;
	icon: string;
}

const AYUDA_TABS: ShellTab[] = [
	{ value: 'qa', label: 'Preguntas frecuentes', icon: 'pi pi-question-circle' },
	{ value: 'ticket', label: 'Generar ticket', icon: 'pi pi-ticket' },
	{ value: 'salud-sede', label: 'Salud de sede', icon: 'pi pi-wave-pulse' }];
// #endregion

/**
 * Shell del panel de ayuda: 3 secciones (QA, Ticket, Salud de sede) navegadas
 * como router children — mismo patrón que `MonitoreoShellComponent`. F5/F6
 * solo necesitan reemplazar el `loadComponent` de sus rutas en `ayuda.routes.ts`
 * (hoy placeholders) sin tocar este shell.
 */
@Component({
	selector: 'app-ayuda-shell',
	standalone: true,
	imports: [RouterOutlet, EduTab, EduTabs],
	templateUrl: './ayuda-shell.component.html',
	styleUrl: './ayuda-shell.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaShellComponent {
	// #region Dependencies
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	// #endregion

	// #region EduTabs
	readonly tabs = AYUDA_TABS;

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
		return segment ?? this.tabs[0].value;
	}
	// #endregion
}
