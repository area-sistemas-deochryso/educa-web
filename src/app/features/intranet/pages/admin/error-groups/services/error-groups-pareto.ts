import { Observable } from 'rxjs';

import { logger } from '@core/helpers';

import { ErrorGroupsService } from './error-groups.service';
import { ErrorGroupsStore } from './error-groups.store';

/**
 * Carga el Pareto de priorización de grupos de error (brief 433, P68 F8.3) —
 * todos los grupos activos, sin paginar, ordenados desc por score. Mismo
 * patrón que {@link ErrorGroupsHeatmap}: agregado independiente de la
 * paginación/filtros de la tabla principal.
 */
export class ErrorGroupsPareto {
	constructor(
		private readonly api: ErrorGroupsService,
		private readonly store: ErrorGroupsStore,
		private readonly takeUntilDestroyed: <TSource>(source: Observable<TSource>) => Observable<TSource>,
	) {}

	loadPareto(): void {
		if (this.store.paretoLoading()) return;
		this.store.setParetoLoading(true);
		const excluirRuido = this.store.excluirRuido();

		this.takeUntilDestroyed(this.api.getPareto(excluirRuido)).subscribe({
			next: (items) => {
				this.store.setParetoItems(items);
				this.store.setParetoLoading(false);
			},
			error: (err) => {
				logger.warn('[ErrorGroupsPareto] Pareto no disponible', err);
				this.store.setParetoItems([]);
				this.store.setParetoLoading(false);
			},
		});
	}
}
