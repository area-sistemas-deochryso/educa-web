import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TooltipModule } from 'primeng/tooltip';

import { HeatmapCell } from '../../models';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface GridCell {
	dayOfWeek: number;
	hour: number;
	count: number;
	avgDuration: number;
	intensity: number;
	tooltip: string;
}

@Component({
	selector: 'app-error-heatmap',
	standalone: true,
	imports: [CommonModule, TooltipModule],
	templateUrl: './error-heatmap.component.html',
	styleUrl: './error-heatmap.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorHeatmapComponent {
	readonly cells = input<HeatmapCell[]>([]);
	readonly loading = input(false);

	readonly dayLabels = DAY_LABELS;
	readonly hours = Array.from({ length: 24 }, (_, i) => i);

	readonly grid = computed(() => {
		const raw = this.cells();
		const maxCount = Math.max(1, ...raw.map((c) => c.count));

		const lookup = new Map<string, HeatmapCell>();
		for (const c of raw) {
			lookup.set(`${c.dayOfWeek}-${c.hour}`, c);
		}

		const result: GridCell[][] = [];
		for (let day = 0; day < 7; day++) {
			const row: GridCell[] = [];
			for (let hour = 0; hour < 24; hour++) {
				const cell = lookup.get(`${day}-${hour}`);
				const count = cell?.count ?? 0;
				const avgDuration = cell?.avgDuration ?? 0;
				const intensity = count / maxCount;
				const tooltip = count > 0
					? `${DAY_LABELS[day]} ${hour}:00 — ${count} error${count !== 1 ? 'es' : ''}, ${Math.round(avgDuration)}ms prom.`
					: `${DAY_LABELS[day]} ${hour}:00 — sin errores`;
				row.push({ dayOfWeek: day, hour, count, avgDuration, intensity, tooltip });
			}
			result.push(row);
		}
		return result;
	});

	getCellColor(intensity: number): string {
		if (intensity === 0) return 'var(--p-surface-100)';
		return `color-mix(in srgb, var(--p-red-500) ${Math.round(intensity * 100)}%, var(--p-orange-100))`;
	}
}
