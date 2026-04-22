// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';
// #endregion

/**
 * Plan 27 · INV-C11 — Banner informativo estático para páginas admin de asistencia.
 * Explica por qué ciertos grados no tienen asistencia diaria biométrica
 * (umbral `GRA_Orden >= 8`, es decir 5to Primaria en adelante).
 *
 * Design system §9 — banner azul con `color-mix()`, texto `--text-color`.
 * a11y — `role="note"` + icono con `aria-hidden="true"`.
 */
@Component({
	selector: 'app-attendance-scope-banner',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './attendance-scope-banner.component.html',
	styleUrl: './attendance-scope-banner.component.scss',
})
export class AttendanceScopeBannerComponent {}
