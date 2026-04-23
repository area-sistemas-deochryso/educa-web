import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import {
	DeferFailStatus,
	DeferFailStatusLevel,
	isProbableTelemetryFailure,
} from '../../models/defer-fail-status.models';

type LevelSeverity = 'success' | 'warn' | 'danger';

/**
 * Plan 22 Chat B (FE) / Plan 29 Chat 2.6 (BE) — widget presentacional del
 * estado defer/fail cPanel + breakdown 24h + resumen blacklist.
 *
 * Complementa al ThrottleStatusWidget: uno mide el throttle per-sender (pool
 * saliente), este mide el techo cPanel a nivel dominio que bloquea envíos si
 * se satura. Todos los comandos (toggle colapso, auto-refresh, refresh manual)
 * se emiten vía outputs para que el facade maneje estado + persistencia.
 */
@Component({
	selector: 'app-defer-fail-status-widget',
	standalone: true,
	imports: [
		DatePipe,
		DecimalPipe,
		FormsModule,
		ButtonModule,
		TagModule,
		ToggleSwitchModule,
		TooltipModule,
	],
	templateUrl: './defer-fail-status-widget.component.html',
	styleUrl: './defer-fail-status-widget.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeferFailStatusWidgetComponent {
	// #region Inputs / Outputs
	readonly status = input<DeferFailStatus | null>(null);
	readonly loading = input<boolean>(false);
	readonly autoRefresh = input<boolean>(false);
	readonly collapsed = input<boolean>(false);

	readonly refresh = output<void>();
	readonly autoRefreshChange = output<boolean>();
	readonly collapsedChange = output<boolean>();
	// #endregion

	// #region Computed
	readonly hasData = computed(() => this.status() !== null);

	readonly levelSeverity = computed<LevelSeverity>(() =>
		this.severityFor(this.status()?.status ?? 'OK'),
	);

	readonly levelIcon = computed(() => {
		switch (this.status()?.status) {
			case 'CRITICAL':
				return 'pi pi-ban';
			case 'WARNING':
				return 'pi pi-exclamation-triangle';
			default:
				return 'pi pi-check-circle';
		}
	});

	readonly levelLabel = computed(() => {
		switch (this.status()?.status) {
			case 'CRITICAL':
				return 'CRITICAL';
			case 'WARNING':
				return 'WARNING';
			default:
				return 'OK';
		}
	});

	/**
	 * Guard fail-safe: CRITICAL con todos los counters en 0 casi seguro es un
	 * error interno del service BE. La UI muestra banner sutil.
	 */
	readonly showTelemetryWarning = computed(() =>
		isProbableTelemetryFailure(this.status()),
	);

	readonly blacklistEmpty = computed(
		() => (this.status()?.blacklist.totalActivos ?? 0) === 0,
	);
	// #endregion

	// #region Helpers usables desde template
	severityFor(level: DeferFailStatusLevel): LevelSeverity {
		switch (level) {
			case 'CRITICAL':
				return 'danger';
			case 'WARNING':
				return 'warn';
			default:
				return 'success';
		}
	}
	// #endregion

	// #region Event handlers
	onRefreshClick(): void {
		this.refresh.emit();
	}

	onAutoRefreshToggle(enabled: boolean): void {
		this.autoRefreshChange.emit(enabled);
	}

	onCollapseToggle(): void {
		this.collapsedChange.emit(!this.collapsed());
	}
	// #endregion
}
