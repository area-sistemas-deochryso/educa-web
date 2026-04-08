import { computed, inject, Injectable, signal } from '@angular/core';

import { BlockedPath, CampusEdge, CampusNode, MiHorarioHoyItem, PathResult } from '../models';
import { PathfindingService } from './pathfinding.service';

interface SelectOption {
	label: string;
	value: string;
	floor: number;
}

@Injectable({ providedIn: 'root' })
export class CampusNavigationStore {
	private readonly pathfinding = inject(PathfindingService);

	// #region Estado privado

	private readonly _nodes = signal<CampusNode[]>([]);
	private readonly _edges = signal<CampusEdge[]>([]);
	private readonly _blockedPaths = signal<BlockedPath[]>([]);
	private readonly _campusReady = signal(false);

	private readonly _scheduleItems = signal<MiHorarioHoyItem[]>([]);
	private readonly _selectedFloor = signal(0);
	private readonly _startNodeId = signal<string | null>(null);
	private readonly _destinationNodeId = signal<string | null>(null);
	private readonly _pathResult = signal<PathResult | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _scheduleReady = signal(false);

	// #endregion
	// #region Lecturas públicas (readonly)

	readonly nodes = this._nodes.asReadonly();
	readonly edges = this._edges.asReadonly();
	readonly blockedPaths = this._blockedPaths.asReadonly();
	readonly campusReady = this._campusReady.asReadonly();

	readonly scheduleItems = this._scheduleItems.asReadonly();
	readonly selectedFloor = this._selectedFloor.asReadonly();
	readonly startNodeId = this._startNodeId.asReadonly();
	readonly destinationNodeId = this._destinationNodeId.asReadonly();
	readonly pathResult = this._pathResult.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly scheduleReady = this._scheduleReady.asReadonly();

	// #endregion
	// #region Computed - Datos derivados

	readonly floors = computed(() => {
		const floorSet = new Set(this._nodes().map((n) => n.floor));
		return [...floorSet].sort((a, b) => a - b);
	});

	readonly currentFloorNodes = computed(() =>
		this._nodes().filter((n) => n.floor === this._selectedFloor()),
	);

	/** Edges del piso actual (ambos nodos deben estar en el mismo piso) */
	readonly currentFloorEdges = computed((): CampusEdge[] => {
		const nodeMap = new Map(this._nodes().map((n) => [n.id, n]));
		const floor = this._selectedFloor();
		return this._edges().filter((e) => {
			const from = nodeMap.get(e.from);
			const to = nodeMap.get(e.to);
			return from && to && from.floor === floor && to.floor === floor;
		});
	});

	/** Mapa salonId → nodeId para vincular horario con nodos del mapa */
	readonly salonToNodeMap = computed(() => {
		const map = new Map<number, string>();
		for (const node of this._nodes()) {
			if (node.salonId != null) {
				map.set(node.salonId, node.id);
			}
		}
		return map;
	});

	/** Opciones planas de todos los nodos navegables (para buscador) */
	readonly allNodeOptions = computed((): SelectOption[] =>
		this._nodes()
			.filter((n) => n.type !== 'corridor')
			.map((n) => ({ label: n.label, value: n.id, floor: n.floor })),
	);

	/** Clase actual o próxima según la hora */
	readonly currentOrNextClass = computed((): MiHorarioHoyItem | null => {
		const items = this._scheduleItems();
		if (items.length === 0) return null;

		const now = new Date();
		const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

		const current = items.find((i) => i.horaInicio <= currentTime && i.horaFin > currentTime);
		if (current) return current;

		const next = items.find((i) => i.horaInicio > currentTime);
		return next ?? null;
	});

	/** Nodos del path que están en el piso actual (para renderizar la ruta) */
	readonly currentFloorPathNodes = computed((): CampusNode[] => {
		const result = this._pathResult();
		if (!result) return [];

		const floor = this._selectedFloor();
		const nodeMap = new Map(this._nodes().map((n) => [n.id, n]));

		return result.path.map((id) => nodeMap.get(id)).filter((n): n is CampusNode => n != null && n.floor === floor);
	});

	/**
	 * Puntos SVG del path en el piso actual.
	 * Usa detección de colisión: si una línea directa entre nodos cruzaría un salón,
	 * se redirige automáticamente por la banda de pasillos más cercana (L-route).
	 */
	readonly currentFloorPathPoints = computed((): string => {
		const pathNodes = this.currentFloorPathNodes();
		if (pathNodes.length < 2) return '';

		const allFloorNodes = this.currentFloorNodes();
		return this.pathfinding.generateSafePathPoints(pathNodes, allFloorNodes);
	});

	// #endregion
	// #region ViewModel consolidado

	readonly vm = computed(() => ({
		scheduleItems: this._scheduleItems(),
		selectedFloor: this._selectedFloor(),
		startNodeId: this._startNodeId(),
		destinationNodeId: this._destinationNodeId(),
		pathResult: this._pathResult(),
		loading: this._loading(),
		error: this._error(),
		scheduleReady: this._scheduleReady(),
		campusReady: this._campusReady(),

		floors: this.floors(),
		currentFloorNodes: this.currentFloorNodes(),
		currentFloorEdges: this.currentFloorEdges(),
		allNodeOptions: this.allNodeOptions(),
		currentOrNextClass: this.currentOrNextClass(),
		currentFloorPathPoints: this.currentFloorPathPoints(),
		salonToNodeMap: this.salonToNodeMap(),

		allNodes: this._nodes(),
		allEdges: this._edges(),

		hasSchedule: this._scheduleItems().length > 0,
		hasPath: this._pathResult() !== null,
		hasCampusData: this._nodes().length > 0,
	}));

	// #endregion
	// #region Comandos de mutación

	setNodes(nodes: CampusNode[]): void {
		this._nodes.set(nodes);
	}

	setEdges(edges: CampusEdge[]): void {
		this._edges.set(edges);
	}

	setBlockedPaths(blockedPaths: BlockedPath[]): void {
		this._blockedPaths.set(blockedPaths);
	}

	setCampusReady(ready: boolean): void {
		this._campusReady.set(ready);
	}

	setScheduleItems(items: MiHorarioHoyItem[]): void {
		this._scheduleItems.set(items);
	}

	setSelectedFloor(floor: number): void {
		this._selectedFloor.set(floor);
	}

	setStartNodeId(nodeId: string | null): void {
		this._startNodeId.set(nodeId);
	}

	setDestinationNodeId(nodeId: string | null): void {
		this._destinationNodeId.set(nodeId);
	}

	setPathResult(result: PathResult | null): void {
		this._pathResult.set(result);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	clearError(): void {
		this._error.set(null);
	}

	setScheduleReady(ready: boolean): void {
		this._scheduleReady.set(ready);
	}

	clearPath(): void {
		this._destinationNodeId.set(null);
		this._pathResult.set(null);
	}
	// #endregion
}
