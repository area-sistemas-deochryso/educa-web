// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FeedbackReportFacade } from '@core/services/feedback';

// #endregion
// #region Implementation
/**
 * Botón flotante persistente para abrir el dialog de reporte de usuario.
 * Visible en toda la intranet, tanto en desktop como en móvil.
 * Se oculta mientras el dialog está abierto o el drawer móvil está abierto
 * para no solapar el footer del menú (Cowork F-002).
 */
@Component({
	selector: 'app-feedback-report-launcher',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	template: `
		@if (visible()) {
			<button
				type="button"
				class="feedback-fab"
				aria-label="Reportar un problema (Ctrl+Alt+F)"
				title="Reportar un problema (Ctrl+Alt+F)"
				(click)="open()"
			>
				<i class="pi pi-megaphone"></i>
				<span class="fab-label">Reportar</span>
			</button>
		}
	`,
	styleUrl: './feedback-report-launcher.component.scss',
})
export class FeedbackReportLauncherComponent {
	private readonly facade = inject(FeedbackReportFacade);

	readonly suppressed = input<boolean>(false);

	readonly visible = computed(() => !this.facade.vm().dialogVisible && !this.suppressed());

	open(): void {
		this.facade.open();
	}
}
// #endregion
