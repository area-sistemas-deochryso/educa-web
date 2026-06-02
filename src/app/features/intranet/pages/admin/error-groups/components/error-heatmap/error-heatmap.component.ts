import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TooltipModule } from 'primeng/tooltip';

import { HeatmapCell } from '../../models';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// BE sends .NET DayOfWeek: Sunday=0, Monday=1...Saturday=6
// FE uses ISO: Monday=0...Sunday=6
const DOTNET_TO_ISO: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

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
	readonly totalDays = input(30);

	readonly dayLabels = DAY_LABELS;
	readonly hours = Array.from({ length: 24 }, (_, i) => i);

	readonly grid = computed(() => {
		const raw = this.cells();

		const isoLookup = new Map<string, HeatmapCell>();
		for (const c of raw) {
			const iso = DOTNET_TO_ISO[c.dayOfWeek] ?? c.dayOfWeek;
			isoLookup.set(`${iso}-${c.hour}`, c);
		}

		const maxCount = Math.max(1, ...raw.map((c) => c.count));

		const result: GridCell[][] = [];
		for (let day = 0; day < 7; day++) {
			const row: GridCell[] = [];
			for (let hour = 0; hour < 24; hour++) {
				const cell = isoLookup.get(`${day}-${hour}`);
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
		if (intensity === 0) return 'transparent';
		return `color-mix(in srgb, var(--p-red-500) ${Math.round(intensity * 100)}%, var(--p-orange-100))`;
	}
}
