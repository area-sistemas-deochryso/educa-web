import { DatePipe, DecimalPipe } from '@angular/common';
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
	PATTERN_LABEL,
	PATTERN_SEVERITY,
	RuntimeHealthSnapshot,
	isProbableTelemetryFailure,
} from '../../models/runtime-health.models';

@Component({
	selector: 'app-runtime-health-widget',
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
	templateUrl: './runtime-health-widget.component.html',
	styleUrl: './runtime-health-widget.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuntimeHealthWidgetComponent {
	// #region Inputs / Outputs
	readonly snapshot = input<RuntimeHealthSnapshot | null>(null);
	readonly loading = input<boolean>(false);
	readonly autoRefresh = input<boolean>(false);
	readonly collapsed = input<boolean>(false);

	readonly refresh = output<void>();
	readonly autoRefreshChange = output<boolean>();
	readonly collapsedChange = output<boolean>();
	// #endregion

	// #region Computed
	readonly hasData = computed(() => this.snapshot() !== null);

	readonly patternLabel = computed(() => {
		const snap = this.snapshot();
		return snap ? PATTERN_LABEL[snap.pattern] : '—';
	});

	readonly patternSeverity = computed(() => {
		const snap = this.snapshot();
		return snap ? PATTERN_SEVERITY[snap.pattern] : 'info';
	});

	readonly patternIcon = computed(() => {
		switch (this.snapshot()?.pattern) {
			case 'OK':
				return 'pi pi-check-circle';
			case 'STARVATION':
				return 'pi pi-clock';
			case 'EXTERNAL_BOTTLENECK':
				return 'pi pi-database';
			case 'OVERLOAD':
				return 'pi pi-exclamation-triangle';
			default:
				return 'pi pi-info-circle';
		}
	});

	readonly showTelemetryWarning = computed(() =>
		isProbableTelemetryFailure(this.snapshot()),
	);

	readonly heapMb = computed(() => {
		const snap = this.snapshot();
		return snap ? snap.gc.heapSizeBytes / (1024 * 1024) : 0;
	});

	readonly totalAllocatedMb = computed(() => {
		const snap = this.snapshot();
		return snap ? snap.gc.totalAllocatedBytes / (1024 * 1024) : 0;
	});
	// #endregion

	// #region Event handlers
	onRefreshClick(): void {
		this.refresh.emit();
	}

	onAutoRefreshChange(value: boolean): void {
		this.autoRefreshChange.emit(value);
	}

	onCollapsedToggle(): void {
		this.collapsedChange.emit(!this.collapsed());
	}
	// #endregion
}
