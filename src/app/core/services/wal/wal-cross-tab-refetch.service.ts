import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WalLeaderService } from './wal-leader.service';

/**
 * Helper genérico para refetch cross-tab tras commit del leader.
 *
 * Cuando el leader commitea una entry WAL del `resourceType` indicado, este
 * helper invoca **ambos** callbacks (`refetchItems` + `refetchStats`) provistos
 * por el facade follower. Suscribe con `takeUntilDestroyed(destroyRef)` para
 * liberar al destruirse el contexto.
 *
 * **Diseño**: la firma exige `refetchItems` y permite `refetchStats` opcional.
 * Esto previene la asimetría que existía antes (098): un único callback
 * `refetch` que omitía estadísticas dejaba contadores stale en follower tabs.
 * Ahora si el feature tiene stats, el caller debe pasarlos explícitos.
 *
 * Uso típico desde un facade (extends `BaseCrudFacade` o no):
 *
 * ```typescript
 * constructor() {
 *   this.crossTabRefetch.subscribe({
 *     resourceType: 'Curso',
 *     refetchItems: () => this.refreshItemsOnly(true),
 *     refetchStats: () => this.refreshEstadisticas(),
 *     destroyRef: this.destroyRef,
 *   });
 * }
 * ```
 *
 * Si el feature NO tiene endpoint de estadísticas (ej: lecturas puras), omitir
 * `refetchStats` es válido. Si lo tiene y se omite, el bug de "contador stale"
 * vuelve — por eso esta firma fuerza la decisión explícita.
 *
 * Ver `rules/optimistic-ui.md` § "Refetch cross-tab tras commit del leader".
 */
@Injectable({ providedIn: 'root' })
export class WalCrossTabRefetchService {
	private readonly leader = inject(WalLeaderService);

	subscribe(opts: {
		resourceType: string;
		refetchItems: () => void;
		refetchStats?: () => void;
		destroyRef: DestroyRef;
	}): void {
		this.leader.entryCommittedByOtherTab$
			.pipe(takeUntilDestroyed(opts.destroyRef))
			.subscribe((event) => {
				if (event.resourceType !== opts.resourceType) return;
				opts.refetchItems();
				opts.refetchStats?.();
			});
	}
}
