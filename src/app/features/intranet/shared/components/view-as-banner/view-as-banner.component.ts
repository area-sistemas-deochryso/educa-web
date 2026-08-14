// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { ViewAsContext, ViewAsContextService } from '@core/services/view-as';
import { ViewAsPickerComponent } from '../view-as-picker';
// #endregion

// #region Implementation
/**
 * "Viendo como: {nombre} · Cambiar" banner (P92 F2, decision #3) — dropped
 * unconditionally into `IntranetLayoutComponent` (same pattern as
 * `WalMigrationBannerComponent`/`WalDegradedBannerComponent`), self-controls
 * visibility via `isVisible()` instead of the layout deciding when to render
 * it, so the layout doesn't need to know about "ver como" at all.
 *
 * "Cambiar" reopens the same `ViewAsPickerComponent` used by the gate page,
 * inline in a dialog — no navigation away from the module, per decision #3.
 */
@Component({
	selector: 'app-view-as-banner',
	standalone: true,
	imports: [ButtonModule, DialogModule, ViewAsPickerComponent],
	templateUrl: './view-as-banner.component.html',
	styleUrl: './view-as-banner.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewAsBannerComponent {
	private readonly viewAsContext = inject(ViewAsContextService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	private readonly _currentUrl = signal(this.router.url);

	constructor() {
		this.router.events
			.pipe(
				filter((event): event is NavigationEnd => event instanceof NavigationEnd),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => this._currentUrl.set(event.urlAfterRedirects));
	}

	readonly activeContext = this.viewAsContext.activeContext;

	readonly isVisible = computed(() => {
		const context = this.activeContext();
		if (!context) return false;
		return this.viewAsContext.isUrlWithinScope(this._currentUrl(), context.rol);
	});

	readonly pickerOpen = signal(false);

	openPicker(): void {
		this.pickerOpen.set(true);
	}

	onDialogVisibleChange(visible: boolean): void {
		this.pickerOpen.set(visible);
	}

	onUserSelected(context: ViewAsContext): void {
		this.viewAsContext.setContext(context);
		this.pickerOpen.set(false);
		// Every "mis-*" facade (Cursos, Notas, Salones, Horarios, Foro, Mensajería)
		// fetches once on mount and never re-subscribes when activeContext() changes,
		// so switching subject here -- unlike the initial pick, which navigates to a
		// different URL and mounts fresh -- left every already-mounted page showing
		// the previous subject's data (brief 538, plan xrepo-97 F2/F3 follow-up).
		// A full reload is the only change that reliably remounts all of them.
		window.location.reload();
	}

	exit(): void {
		this.viewAsContext.clearContext();
		this.router.navigateByUrl('/intranet');
	}
}
// #endregion
