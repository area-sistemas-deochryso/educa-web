import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';

import { HeatmapCalendarCell, HeatmapCell } from '../../models';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const DOTNET_TO_ISO: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

interface GridCell {
	dayOfWeek: number;
	hour: number;
	count: number;
	avgDuration: number;
	intensity: number;
	tooltip: string;
}

interface CalendarGridCell {
	date: Date | null;
	dateIso: string | null;
	count: number;
	avgDuration: number;
	intensity: number;
	tooltip: string;
	dayLabel: string;
}

export interface HeatmapPeriodOption {
	label: string;
	value: 7 | 30;
}

@Component({
	selector: 'app-error-heatmap',
	standalone: true,
	imports: [CommonModule, DatePipe, FormsModule, ButtonModule, DatePickerModule, SelectButtonModule, TooltipModule],
	templateUrl: './error-heatmap.component.html',
	styleUrl: './error-heatmap.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorHeatmapComponent {
	readonly cells = input<HeatmapCell[]>([]);
	readonly calendarCells = input<HeatmapCalendarCell[]>([]);
	readonly loading = input(false);
	readonly totalDays = input<7 | 30>(30);
	readonly endDate = input<Date | null>(null);

	readonly periodChange = output<7 | 30>();
	readonly endDateChange = output<Date | null>();
	/** Drill-down (brief 432, P68 F8.2) — solo celdas del calendario con count > 0. */
	readonly cellClick = output<string>();

	readonly periodOptions: HeatmapPeriodOption[] = [
		{ label: 'Semanal', value: 7 },
		{ label: 'Calendario', value: 30 },
	];

	readonly today = new Date();

	readonly isWeekMode = computed(() => this.totalDays() === 7);

	readonly canGoNext = computed(() => {
		const end = this.endDate();
		if (!end) return false;
		const todayMidnight = new Date(this.today);
		todayMidnight.setHours(0, 0, 0, 0);
		const endMidnight = new Date(end);
		endMidnight.setHours(0, 0, 0, 0);
		return endMidnight < todayMidnight;
	});

	readonly calendarTooltip = computed(() =>
		`Últimos ${this.totalDays()} días hasta la fecha elegida`,
	);

	readonly rangeLabel = computed(() => {
		const days = this.totalDays();
		const end = this.endDate() ?? new Date();
		const start = new Date(end);
		start.setDate(start.getDate() - days);
		return { start, end };
	});

	readonly dayLabels = DAY_LABELS;
	readonly hours = Array.from({ length: 24 }, (_, i) => i);

	readonly hourlyGrid = computed(() => {
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

	readonly calendarGrid = computed(() => {
		const raw = this.calendarCells();
		if (!raw.length) return [];

		const lookup = new Map<string, HeatmapCalendarCell>();
		for (const c of raw) {
			lookup.set(c.date.slice(0, 10), c);
		}

		const maxCount = Math.max(1, ...raw.map((c) => c.count));

		const days = this.totalDays();
		const end = this.endDate() ?? new Date();
		const start = new Date(end);
		start.setDate(start.getDate() - days);
		start.setDate(start.getDate() + 1);

		const firstDow = (start.getDay() + 6) % 7;

		const allDays: CalendarGridCell[] = [];
		for (let i = 0; i < firstDow; i++) {
			allDays.push({ date: null, dateIso: null, count: 0, avgDuration: 0, intensity: 0, tooltip: '', dayLabel: '' });
		}

		const cursor = new Date(start);
		while (cursor <= end) {
			const dateStr = cursor.toISOString().slice(0, 10);
			const cell = lookup.get(dateStr);
			const count = cell?.count ?? 0;
			const avgDuration = cell?.avgDurationMs ?? 0;
			const intensity = count / maxCount;
			const dayNum = cursor.getDate();
			const tooltip = count > 0
				? `${dayNum} — ${count} error${count !== 1 ? 'es' : ''}, ${Math.round(avgDuration)}ms prom. (click para ver los grupos)`
				: `${dayNum} — sin errores`;
			allDays.push({
				date: new Date(cursor),
				dateIso: dateStr,
				count,
				avgDuration,
				intensity,
				tooltip,
				dayLabel: String(dayNum),
			});
			cursor.setDate(cursor.getDate() + 1);
		}

		const weeks: CalendarGridCell[][] = [];
		for (let i = 0; i < allDays.length; i += 7) {
			weeks.push(allDays.slice(i, i + 7));
		}
		const lastWeek = weeks[weeks.length - 1];
		while (lastWeek.length < 7) {
			lastWeek.push({ date: null, dateIso: null, count: 0, avgDuration: 0, intensity: 0, tooltip: '', dayLabel: '' });
		}

		return weeks;
	});

	onCalendarCellClick(cell: CalendarGridCell): void {
		if (!cell.dateIso || cell.count === 0) return;
		this.cellClick.emit(cell.dateIso);
	}

	onPeriodChange(value: 7 | 30): void {
		this.periodChange.emit(value);
	}

	onEndDateChange(date: Date | null): void {
		this.endDateChange.emit(date);
	}

	onPrev(): void {
		const days = this.totalDays();
		const base = this.endDate() ?? new Date(this.today);
		const next = new Date(base);
		next.setDate(next.getDate() - days);
		this.endDateChange.emit(next);
	}

	onNext(): void {
		const days = this.totalDays();
		const base = this.endDate() ?? new Date(this.today);
		const next = new Date(base);
		next.setDate(next.getDate() + days);
		const todayMidnight = new Date(this.today);
		todayMidnight.setHours(0, 0, 0, 0);
		if (next > todayMidnight) {
			this.endDateChange.emit(null);
		} else {
			this.endDateChange.emit(next);
		}
	}

	getCellColor(intensity: number): string {
		if (intensity === 0) return 'transparent';
		return `color-mix(in srgb, var(--p-red-500) ${Math.round(intensity * 100)}%, var(--p-orange-100))`;
	}
}
