import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY } from 'rxjs';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';

import { CAMPUS_BLOCKED_PATHS, CAMPUS_EDGES, CAMPUS_NODES } from '../config';
import { CampusNavigationApiService } from './campus-navigation-api.service';
import { CampusNavigationStore } from './campus-navigation.store';
import { PathfindingService } from './pathfinding.service';

@Injectable({ providedIn: 'root' })
export class CampusNavigationFacade {
	private api = inject(CampusNavigationApiService);
	private store = inject(CampusNavigationStore);
	private pathfinding = inject(PathfindingService);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);

	// #region Exponer estado del store

	readonly vm = this.store.vm;

	// #endregion
	// #region Comandos

	loadSchedule(): void {
		this.store.setLoading(true);

		this.api
			.getMiHorarioHoy()
			.pipe(
				catchError((err) => {
					logger.error('Error cargando horario del dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a:', err);
					this.store.setScheduleItems([]);
					this.store.setLoading(false);
					this.store.setScheduleReady(true);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((items) => {
				this.store.setScheduleItems(items);
				this.store.setLoading(false);
				this.store.setScheduleReady(true);

				// Auto-seleccionar destino si hay clase actual/prÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³xima
				const current = this.store.currentOrNextClass();
				if (current) {
					this.navigateToSalon(current.salonId);
				}
			});
	}

	selectFloor(floor: number): void {
		this.store.setSelectedFloor(floor);
	}

	setStartNode(nodeId: string | null): void {
		this.store.setStartNodeId(nodeId);
		this.recalculatePath();
	}

	setDestination(nodeId: string | null): void {
		this.store.setDestinationNodeId(nodeId);
		this.recalculatePath();
	}

	/**
	 * Desde el panel de horario: buscar nodo por salonId y navegar a ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©l
	 */
	navigateToSalon(salonId: number): void {
		const salonMap = this.store.salonToNodeMap();
		const nodeId = salonMap.get(salonId);

		if (nodeId) {
			this.store.setDestinationNodeId(nodeId);
			this.recalculatePath();

			// Auto-cambiar al piso del destino
			const node = CAMPUS_NODES.find((n) => n.id === nodeId);
			if (node) {
				this.store.setSelectedFloor(node.floor);
			}
		}
	}

	/**
	 * Click en un nodo del mapa ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ establecer como destino
	 */
	onMapNodeClick(nodeId: string): void {
		const node = CAMPUS_NODES.find((n) => n.id === nodeId);
		if (!node || node.type === 'corridor') return;

		this.store.setDestinationNodeId(nodeId);
		this.recalculatePath();
	}

	clearPath(): void {
		this.store.clearPath();
	}

	// #endregion
	// #region Pathfinding

	private recalculatePath(): void {
		const startId = this.store.startNodeId();
		const destId = this.store.destinationNodeId();

		if (!startId || !destId) {
			this.store.setPathResult(null);
			return;
		}

		const result = this.pathfinding.findPath(
			startId,
			destId,
			CAMPUS_NODES,
			CAMPUS_EDGES,
			CAMPUS_BLOCKED_PATHS,
		);

		this.store.setPathResult(result);
	}
	// #endregion
}
