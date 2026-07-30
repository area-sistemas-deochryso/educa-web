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
		return this._currentUrl().startsWith(`/intranet/${context.rol.toLowerCase()}`);
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
	}

	exit(): void {
		this.viewAsContext.clearContext();
		this.router.navigateByUrl('/intranet');
	}
}
// #endregion
