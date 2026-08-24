// #region Imports
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InformativeModeService } from '@intranet-shared/services';
// #endregion

// #region Helpers
/** Margen (px) entre el elemento resaltado y la ventana de explicación. */
const CALLOUT_MARGIN_PX = 12;
/** Ancho fijo de la ventana — permite clampear su posición contra los bordes del viewport. */
const CALLOUT_WIDTH_PX = 320;
/** Altura estimada para decidir si la ventana cae debajo o arriba del resaltado. */
const CALLOUT_ESTIMATED_HEIGHT_PX = 140;
// #endregion

// #region Implementation
/**
 * Callout del modo informativo (brief 524, plan xrepo-96 F1+F2): fondo atenuado + resaltado
 * del elemento clickeado + ventana con la explicación. Visualmente distinto de `eduTooltip`
 * (aparece al click, no al hover — pre-work confirmó que `eduTooltip` está en uso masivo).
 *
 * Montado siempre en el DOM (mismo patrón que `app-feedback-report-dialog`); solo se
 * renderiza cuando `InformativeModeService.currentCallout()` tiene contenido.
 */
@Component({
	selector: 'app-informative-mode-callout',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	templateUrl: './informative-mode-callout.component.html',
	styleUrl: './informative-mode-callout.component.scss',
})
export class InformativeModeCalloutComponent {
	private readonly informativeMode = inject(InformativeModeService);

	readonly callout = this.informativeMode.currentCallout;

	highlightStyle(rect: DOMRect): Record<string, string> {
		return {
			top: `${rect.top}px`,
			left: `${rect.left}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`,
		};
	}

	calloutStyle(rect: DOMRect): Record<string, string> {
		const left = Math.min(Math.max(CALLOUT_MARGIN_PX, rect.left), window.innerWidth - CALLOUT_WIDTH_PX - CALLOUT_MARGIN_PX);
		const fitsBelow = rect.bottom + CALLOUT_ESTIMATED_HEIGHT_PX + CALLOUT_MARGIN_PX <= window.innerHeight;
		const top = fitsBelow
			? rect.bottom + CALLOUT_MARGIN_PX
			: Math.max(CALLOUT_MARGIN_PX, rect.top - CALLOUT_ESTIMATED_HEIGHT_PX - CALLOUT_MARGIN_PX);

		return { top: `${top}px`, left: `${left}px`, width: `${CALLOUT_WIDTH_PX}px` };
	}

	close(): void {
		this.informativeMode.dismissCallout();
	}
}
// #endregion
