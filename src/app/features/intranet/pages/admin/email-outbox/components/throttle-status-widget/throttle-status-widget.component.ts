import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import {
	computeSeverity,
	ThrottleSeverity,
	ThrottleStatus,
} from '../../models/throttle-status.models';

/**
 * Plan 22 Chat B — widget presentacional del estado throttle saliente SMTP.
 *
 * Renderiza N counters per-sender (1..7 según config) + 1 counter agregado de
 * dominio. Los emails llegan enmascarados desde el BE y se pintan tal cual.
 * Todos los comandos (toggle colapso, toggle auto-refresh, refresh manual) se
 * emiten via outputs para que el facade maneje estado + persistencia.
 */
@Component({
	selector: 'app-throttle-status-widget',
	standalone: true,
	imports: [FormsModule, ButtonModule, TagModule, ToggleSwitchModule, TooltipModule],
	templateUrl: './throttle-status-widget.component.html',
	styleUrl: './throttle-status-widget.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThrottleStatusWidgetComponent {
	// #region Inputs / Outputs
	readonly status = input<ThrottleStatus | null>(null);
	readonly loading = input<boolean>(false);
	readonly autoRefresh = input<boolean>(false);
	readonly collapsed = input<boolean>(false);

	readonly refresh = output<void>();
	readonly autoRefreshChange = output<boolean>();
	readonly collapsedChange = output<boolean>();
	// #endregion

	// #region Computed
	readonly hasData = computed(() => {
		const s = this.status();
		return s !== null && s.throttleEnabled;
	});

	readonly throttleDisabled = computed(() => {
		const s = this.status();
		return s !== null && !s.throttleEnabled;
	});

	readonly domainSeverity = computed<ThrottleSeverity>(() => {
		const s = this.status();
		if (!s) return 'success';
		return computeSeverity(s.domainCount, s.domainLimit);
	});

	readonly domainNearLimit = computed(() => {
		const s = this.status();
		if (!s || s.domainLimit <= 0) return false;
		return s.domainCount / s.domainLimit >= 0.9;
	});
	// #endregion

	// #region Helpers (usables desde el template)
	/** Severity del card per-sender según ratio count/limit. */
	severityFor(count: number, limit: number): ThrottleSeverity {
		return computeSeverity(count, limit);
	}

	labelFor(count: number, limit: number): string {
		const sev = computeSeverity(count, limit);
		switch (sev) {
			case 'danger':
				return 'Saturado';
			case 'warn':
				return 'Alto';
			case 'info':
				return 'Medio';
			default:
				return 'OK';
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
