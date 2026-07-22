import { Observable } from 'rxjs';

import { logger } from '@core/helpers';
import { RuntimeHealthService } from '@features/intranet/pages/admin/sistema/runtime-health/services/runtime-health.service';

import { ErrorGroupsStore } from './error-groups.store';

const WINDOW_DAYS = 30;

/**
 * Carga los arranques de proceso (proxy de deploy, brief 474/BE) para
 * superponerlos como marcadores en el timeline de ocurrencias (brief 473).
 * Misma ventana de 30d que el trend de ocurrencias — el BE de trend no
 * acepta rango, así que acá lo calculamos client-side.
 *
 * Endpoint ajeno a `ErrorGroupsService` (vive en `RuntimeHealthController`,
 * gate `ADMIN_SISTEMA_RUNTIME_HEALTH`) — si el usuario no tiene esa
 * capability el BE responde 403 y acá lo tratamos como "sin marcadores",
 * igual que el resto de las fuentes opcionales de este store (trend, pareto).
 */
export class ErrorGroupsDeployMarkers {
	private requested = false;

	constructor(
		private readonly runtimeHealthApi: RuntimeHealthService,
		private readonly store: ErrorGroupsStore,
		private readonly takeUntilDestroyed: <TSource>(source: Observable<TSource>) => Observable<TSource>,
	) {}

	/** Idempotente: solo dispara la primera vez (los arranques no cambian en la sesión). */
	requestDeployMarkers(): void {
		if (this.requested) return;
		this.requested = true;
		this.store.setDeployMarkersLoading(true);

		const to = new Date();
		const from = new Date(to.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

		this.takeUntilDestroyed(this.runtimeHealthApi.getStartups(from, to)).subscribe({
			next: (startups) => {
				this.store.setDeployMarkers(startups.map((s) => new Date(s.timestamp).getTime()));
			},
			error: (err) => {
				logger.warn('[ErrorGroupsDeployMarkers] Arranques de proceso no disponibles', err);
				this.store.setDeployMarkers([]);
			},
		});
	}
}
