import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WalLeaderService } from './wal-leader.service';

/**
 * Helper genérico para refetch cross-tab tras commit del leader.
 *
 * Cuando el leader commitea una entry WAL del `resourceType` indicado, este
 * helper invoca el `refetch` provisto por el facade follower. Suscribe con
 * `takeUntilDestroyed(destroyRef)` para liberar al destruirse el contexto.
 *
 * Uso típico desde un facade (extends `BaseCrudFacade` o no):
 *
 * ```typescript
 * constructor() {
 *   this.crossTabRefetch.subscribe({
 *     resourceType: 'Curso',
 *     refetch: () => this.refreshItemsOnly(true),
 *     destroyRef: this.destroyRef,
 *   });
 * }
 * ```
 *
 * Ver `rules/optimistic-ui.md` § "Refetch cross-tab tras commit del leader".
 */
@Injectable({ providedIn: 'root' })
export class WalCrossTabRefetchService {
	private readonly leader = inject(WalLeaderService);

	subscribe(opts: {
		resourceType: string;
		refetch: () => void;
		destroyRef: DestroyRef;
	}): void {
		this.leader.entryCommittedByOtherTab$
			.pipe(takeUntilDestroyed(opts.destroyRef))
			.subscribe((event) => {
				if (event.resourceType !== opts.resourceType) return;
				opts.refetch();
			});
	}
}
