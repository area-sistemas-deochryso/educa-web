// #region Imports
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
// #endregion

// #region Types
export type DeferFailBannerSeverity = 'info' | 'warn' | 'danger';

export interface DeferFailBannerState {
	visible: boolean;
	severity: DeferFailBannerSeverity;
	contadorActual: number | null;
	threshold: number | null;
	correoEnmascarado: string | null;
	motivo: string | null;
}
// #endregion

// #region Implementation
/**
 * Plan 38 Chat 6 — Banner B9 (`design-system.md` §6.B9) que avisa al admin
 * cuando el dominio se acerca o cruza el techo `defer/fail` del hosting,
 * o cuando el `MailboxFullBlacklistHandler` insertó una entrada nueva.
 *
 * Severity:
 * - `warn`  → contador defer/fail >= 60% del threshold (banda WARNING) o
 *             un `BlacklistEntryCreated` ocurrió en los últimos 5 min.
 * - `danger`→ contador >= 100% del threshold (banda CRITICAL).
 * - `info`  → estado normal — el banner se oculta (visible=false).
 */
@Component({
	selector: 'app-defer-fail-banner',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './defer-fail-banner.component.html',
	styleUrl: './defer-fail-banner.component.scss',
})
export class DeferFailBannerComponent {
	readonly state = input.required<DeferFailBannerState>();

	readonly visible = computed(() => this.state().visible);
	readonly severity = computed(() => this.state().severity);
	readonly contadorActual = computed(() => this.state().contadorActual);
	readonly threshold = computed(() => this.state().threshold);
	readonly correoEnmascarado = computed(() => this.state().correoEnmascarado);
	readonly motivo = computed(() => this.state().motivo);

	readonly title = computed(() => {
		const severity = this.severity();
		if (severity === 'danger') return 'Bloqueo en curso del dominio';
		if (severity === 'warn') return 'Riesgo de bloqueo del dominio';
		return '';
	});

	readonly icon = computed(() => {
		const severity = this.severity();
		if (severity === 'danger') return 'pi pi-exclamation-circle';
		return 'pi pi-exclamation-triangle';
	});

	readonly contadorLabel = computed(() => {
		const actual = this.contadorActual();
		const limit = this.threshold();
		if (actual === null || limit === null) return null;
		return `${actual} / ${limit} fallos en la última hora`;
	});

	readonly recentBlacklistLabel = computed(() => {
		const correo = this.correoEnmascarado();
		const motivo = this.motivo();
		if (!correo || !motivo) return null;
		return `${correo} — ${motivo}`;
	});
}
// #endregion
