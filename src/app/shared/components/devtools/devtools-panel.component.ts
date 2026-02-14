// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from '@angular/core';

import { FeatureFlagsFacade, FeatureFlagKey } from '@core/services/feature-flags';
import { LoggingFacade } from '@core/helpers';
import { RequestTraceFacade } from '@core/services/trace';
// #endregion

// #region Implementation
@Component({
	selector: 'app-devtools-panel',
	standalone: true,
	templateUrl: './devtools-panel.component.html',
	styleUrl: './devtools-panel.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevtoolsPanelComponent {
	// #region Dependencias
	private readonly flags = inject(FeatureFlagsFacade);
	private readonly logging = inject(LoggingFacade);
	private readonly trace = inject(RequestTraceFacade);
	// #endregion

	// #region Estado local
	private readonly _open = signal(false);
	readonly open = this._open.asReadonly();
	// #endregion

	// #region Estado de facades
	readonly flagsVm = this.flags.vm;
	readonly loggingVm = this.logging.vm;
	readonly traceVm = this.trace.vm;
	// #endregion

	// #region Computed
	readonly isDev = computed(() => this.flagsVm().isDev);
	// #endregion

	// #region Constantes
	readonly logLevels = ['error', 'warn', 'info', 'log', 'debug'] as const;
	readonly debugLevels = ['ERROR', 'WARN', 'INFO', 'TRACE'] as const;
	// #endregion

	// #region Event handlers
	toggleOpen(): void {
		this._open.update((v) => !v);
	}

	setFlag(key: FeatureFlagKey, value: boolean): void {
		this.flags.setFlag(key, value);
	}

	resetFlag(key: FeatureFlagKey): void {
		this.flags.resetFlag(key);
	}

	clearFlagOverrides(): void {
		this.flags.clearOverrides();
	}

	setLogEnabled(enabled: boolean): void {
		this.logging.setLogEnabled(enabled);
	}

	setLogFilter(value: string): void {
		this.logging.setLogFilter(value);
	}

	setLogMinLevel(value: string): void {
		if (this.logLevels.includes(value as (typeof this.logLevels)[number])) {
			this.logging.setLogMinLevel(value as (typeof this.logLevels)[number]);
		}
	}

	setDebugEnabled(enabled: boolean): void {
		this.logging.setDebugEnabled(enabled);
	}

	setDebugFilter(value: string): void {
		this.logging.setDebugFilter(value);
	}

	setDebugMinLevel(value: string): void {
		if (this.debugLevels.includes(value as (typeof this.debugLevels)[number])) {
			this.logging.setDebugMinLevel(value as (typeof this.debugLevels)[number]);
		}
	}

	setTraceEnabled(enabled: boolean): void {
		this.trace.setEnabled(enabled);
	}

	setTraceFilter(value: string): void {
		this.trace.setFilter(value);
	}

	setTraceMaxEntries(value: string): void {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) {
			this.trace.setMaxEntries(parsed);
		}
	}

	clearTrace(): void {
		this.trace.clear();
	}
	// #endregion
}
// #endregion
