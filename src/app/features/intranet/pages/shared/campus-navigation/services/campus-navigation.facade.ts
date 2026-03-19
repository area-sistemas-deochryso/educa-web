import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, forkJoin } from 'rxjs';

import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { UI_SUMMARIES } from '@app/shared/constants';

import {
	CampusCompletoDto,
	CampusPisoCompletoDto,
	CampusConexionVerticalDto,
} from '@features/intranet/pages/admin/campus/models';
import { CampusEdge, CampusNode, CampusNodeType } from '../models';
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

	/**
	 * Carga campus + horario en paralelo, luego auto-selecciona destino.
	 * @param overrideDestinationSalonId Si se pasa, navega a este salón en vez de la clase actual/próxima
	 */
	loadData(overrideDestinationSalonId?: number): void {
		this.store.setLoading(true);
		this.store.clearError();

		forkJoin({
			campus: this.api.getCampusCompleto().pipe(
				withRetry({ tag: 'CampusNavigationFacade:loadCampus' }),
			),
			schedule: this.api.getMiHorarioHoy().pipe(
				withRetry({ tag: 'CampusNavigationFacade:loadSchedule' }),
			),
		})
			.pipe(
				catchError((err) => {
					logger.error('Error cargando datos de navegación:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo cargar los datos del campus');
					this.store.setError('No se pudo cargar los datos del campus');
					this.store.setLoading(false);
					this.store.setCampusReady(true);
					this.store.setScheduleReady(true);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(({ campus, schedule }) => {
				// Adaptar datos del campus
				const { nodes, edges } = this.adaptCampusData(campus);
				this.store.setNodes(nodes);
				this.store.setEdges(edges);
				this.store.setBlockedPaths([]);
				this.store.setCampusReady(true);

				// Auto-seleccionar primer piso
				if (nodes.length > 0) {
					const floors = [...new Set(nodes.map((n) => n.floor))].sort((a, b) => a - b);
					this.store.setSelectedFloor(floors[0]);
				}

				// Setear horario
				this.store.setScheduleItems(schedule);
				this.store.setScheduleReady(true);
				this.store.setLoading(false);

				// Auto-seleccionar destino
				if (overrideDestinationSalonId) {
					this.navigateToSalon(overrideDestinationSalonId);
				} else {
					const current = this.store.currentOrNextClass();
					if (current) {
						this.navigateToSalon(current.salonId);
					}
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

	/** Desde el panel de horario: buscar nodo por salonId y navegar a él */
	navigateToSalon(salonId: number): void {
		const salonMap = this.store.salonToNodeMap();
		const nodeId = salonMap.get(salonId);

		if (nodeId) {
			this.store.setDestinationNodeId(nodeId);
			this.recalculatePath();

			// Auto-cambiar al piso del destino
			const nodes = this.store.nodes();
			const node = nodes.find((n) => n.id === nodeId);
			if (node) {
				this.store.setSelectedFloor(node.floor);
			}
		}
	}

	/** Click en un nodo del mapa → si no hay inicio, poner inicio; si ya hay, poner destino */
	onMapNodeClick(nodeId: string): void {
		const nodes = this.store.nodes();
		const node = nodes.find((n) => n.id === nodeId);
		if (!node || node.type === 'corridor') return;

		if (!this.store.startNodeId()) {
			this.store.setStartNodeId(nodeId);
		} else {
			this.store.setDestinationNodeId(nodeId);
			this.recalculatePath();
		}
	}

	clearStart(): void {
		this.store.setStartNodeId(null);
		this.store.setPathResult(null);
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
			this.store.nodes(),
			this.store.edges(),
			this.store.blockedPaths(),
		);

		this.store.setPathResult(result);
	}

	// #endregion
	// #region Adaptador API → Modelos de navegación

	/**
	 * Convierte CampusCompletoDto (numérico, por pisos) a CampusNode[] + CampusEdge[] (string IDs, flat).
	 * - Nodos: id numérico → string "n-{id}", pisoId → floor (orden del piso)
	 * - Aristas intra-piso: nodoOrigenId/nodoDestinoId → string IDs
	 * - Conexiones verticales: se convierten en edges cross-floor con peso promedio
	 */
	private adaptCampusData(dto: CampusCompletoDto): { nodes: CampusNode[]; edges: CampusEdge[] } {
		const nodes: CampusNode[] = [];
		const edges: CampusEdge[] = [];

		for (const piso of dto.pisos) {
			this.adaptPiso(piso, nodes, edges);
		}

		for (const cv of dto.conexionesVerticales) {
			this.adaptConexionVertical(cv, edges);
		}

		return { nodes, edges };
	}

	private adaptPiso(
		piso: CampusPisoCompletoDto,
		nodes: CampusNode[],
		edges: CampusEdge[],
	): void {
		for (const nodo of piso.nodos) {
			if (!nodo.estado) continue;
			nodes.push({
				id: `n-${nodo.id}`,
				type: nodo.tipo as CampusNodeType,
				label: nodo.etiqueta || nodo.salonDescripcion || '',
				floor: piso.orden,
				x: nodo.x,
				y: nodo.y,
				width: nodo.width > 0 ? nodo.width : undefined,
				height: nodo.height > 0 ? nodo.height : undefined,
				salonId: nodo.salonId ?? undefined,
			});
		}

		for (const arista of piso.aristas) {
			if (!arista.estado) continue;
			edges.push({
				from: `n-${arista.nodoOrigenId}`,
				to: `n-${arista.nodoDestinoId}`,
				distance: arista.peso,
				bidirectional: arista.bidireccional,
			});
		}
	}

	private adaptConexionVertical(
		cv: CampusConexionVerticalDto,
		edges: CampusEdge[],
	): void {
		if (!cv.estado) return;

		const distance = cv.bidireccional
			? (cv.pesoSubida + cv.pesoBajada) / 2
			: cv.pesoSubida;

		edges.push({
			from: `n-${cv.nodoOrigenId}`,
			to: `n-${cv.nodoDestinoId}`,
			distance,
			bidirectional: cv.bidireccional,
		});
	}

	// #endregion
}
