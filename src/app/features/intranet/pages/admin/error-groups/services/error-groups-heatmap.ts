import { Observable } from 'rxjs';

import { logger } from '@core/helpers';

import { ErrorGroupsService } from './error-groups.service';
import { ErrorGroupsStore } from './error-groups.store';

/** Carga el heatmap de grupos de error (celdas semanales o calendario mensual). */
export class ErrorGroupsHeatmap {
	constructor(
		private readonly api: ErrorGroupsService,
		private readonly store: ErrorGroupsStore,
		private readonly takeUntilDestroyed: <TSource>(source: Observable<TSource>) => Observable<TSource>,
	) {}

	loadHeatmap(): void {
		if (this.store.heatmapLoading()) return;
		this.store.setHeatmapLoading(true);
		const days = this.store.heatmapDays();
		const endDate = this.store.heatmapEndDate();
		const endDateParam = endDate ? endDate.toISOString().slice(0, 10) : undefined;

		if (days === 30) {
			this.takeUntilDestroyed(this.api.getHeatmapCalendar(days, endDateParam)).subscribe({
				next: (cells) => {
					this.store.setHeatmapCalendarCells(cells);
					this.store.setHeatmapCells([]);
					this.store.setHeatmapLoading(false);
				},
				error: (err) => {
					logger.warn('[ErrorGroupsHeatmap] Heatmap calendar no disponible', err);
					this.store.setHeatmapCalendarCells([]);
					this.store.setHeatmapLoading(false);
				},
			});
		} else {
			this.takeUntilDestroyed(this.api.getHeatmap(days, endDateParam)).subscribe({
				next: (cells) => {
					this.store.setHeatmapCells(cells);
					this.store.setHeatmapCalendarCells([]);
					this.store.setHeatmapLoading(false);
				},
				error: (err) => {
					logger.warn('[ErrorGroupsHeatmap] Heatmap no disponible', err);
					this.store.setHeatmapCells([]);
					this.store.setHeatmapLoading(false);
				},
			});
		}
	}

	setHeatmapPeriod(days: 7 | 30): void {
		this.store.setHeatmapDays(days);
		this.loadHeatmap();
	}

	setHeatmapEndDate(date: Date | null): void {
		this.store.setHeatmapEndDate(date);
		this.loadHeatmap();
	}
}
