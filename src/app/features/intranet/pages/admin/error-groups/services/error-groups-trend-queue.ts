import { Observable } from 'rxjs';

import { logger } from '@core/helpers';

import { ErrorGroupTrendDto } from '../models';
import { ErrorGroupsService } from './error-groups.service';
import { ErrorGroupsStore } from './error-groups.store';

const TREND_MAX_CONCURRENT = 3;

/**
 * Solicita el trend de 30d de grupos de error con concurrencia limitada.
 * Idempotente por grupo: si ya hay cache (loading, loaded o error), no relanza.
 */
export class ErrorGroupsTrendQueue {
	private readonly trendQueue: number[] = [];
	private trendInFlight = 0;

	constructor(
		private readonly api: ErrorGroupsService,
		private readonly store: ErrorGroupsStore,
		private readonly takeUntilDestroyed: <TSource>(source: Observable<TSource>) => Observable<TSource>,
	) {}

	requestTrend(grupoId: number): void {
		if (this.store.getTrendEntry(grupoId)) return;
		this.store.setTrendStatus(grupoId, 'loading');
		this.trendQueue.push(grupoId);
		this.drainTrendQueue();
	}

	private drainTrendQueue(): void {
		while (this.trendInFlight < TREND_MAX_CONCURRENT && this.trendQueue.length > 0) {
			const grupoId = this.trendQueue.shift()!;
			this.fetchTrendNow(grupoId);
		}
	}

	private fetchTrendNow(grupoId: number): void {
		this.trendInFlight++;
		this.takeUntilDestroyed(this.api.getTrend(grupoId)).subscribe({
			next: (trend: ErrorGroupTrendDto) => {
				this.store.setTrendStatus(
					grupoId,
					'loaded',
					(trend?.timestamps ?? []).map((t) => new Date(t).getTime()),
					trend?.truncado ?? false,
				);
				this.trendInFlight--;
				this.drainTrendQueue();
			},
			error: (err) => {
				logger.warn(`[ErrorGroupsTrendQueue] Trend ${grupoId} no disponible`, err);
				this.store.setTrendStatus(grupoId, 'error', [], false);
				this.trendInFlight--;
				this.drainTrendQueue();
			},
		});
	}
}
