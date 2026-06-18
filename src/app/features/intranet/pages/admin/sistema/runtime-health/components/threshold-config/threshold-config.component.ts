import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
	METRIC_LABELS,
	ThresholdConfig,
	ThresholdDirection,
} from '../../models/runtime-health.models';

@Component({
	selector: 'app-threshold-config',
	standalone: true,
	imports: [
		FormsModule,
		ButtonModule,
		InputNumberModule,
		SelectModule,
		TableModule,
		TagModule,
	],
	templateUrl: './threshold-config.component.html',
	styleUrl: './threshold-config.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThresholdConfigComponent {
	readonly thresholds = input<ThresholdConfig[]>([]);
	readonly loading = input(false);
	readonly saving = input(false);

	readonly save = output<ThresholdConfig[]>();

	readonly editableRows = signal<ThresholdConfig[]>([]);
	readonly dirty = signal(false);

	readonly directionOptions: { label: string; value: ThresholdDirection }[] = [
		{ label: 'Por encima', value: 'Above' },
		{ label: 'Por debajo', value: 'Below' },
	];

	readonly hasData = computed(() => this.thresholds().length > 0);

	readonly metricLabels = METRIC_LABELS;

	getMetricLabel(key: string): string {
		return METRIC_LABELS[key] ?? key;
	}

	onLoadClick(): void {
		this.editableRows.set(
			this.thresholds().map(t => ({ ...t })),
		);
		this.dirty.set(false);
	}

	onFieldChange(): void {
		this.dirty.set(true);
	}

	onSave(): void {
		this.save.emit(this.editableRows());
		this.editableRows.set([]);
		this.dirty.set(false);
	}

	onCancel(): void {
		this.editableRows.set([]);
		this.dirty.set(false);
	}
}
