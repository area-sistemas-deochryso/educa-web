import { computed, inject, Injectable, signal } from '@angular/core';

import { CampusNode, MiHorarioHoyItem, PathResult } from '../models';
import { CAMPUS_NODES } from '../config';
import { PathfindingService } from './pathfinding.service';

interface SelectOption {
	label: string;
	value: string;
}

@Injectable({ providedIn: 'root' })
export class CampusNavigationStore {
	private readonly pathfinding = inject(PathfindingService);

	// #region Estado privado

	private readonly _scheduleItems = signal<MiHorarioHoyItem[]>([]);
	private readonly _selectedFloor = signal(0);
	private readonly _startNodeId = signal<string | null>(null);
	private readonly _destinationNodeId = signal<string | null>(null);
	private readonly _pathResult = signal<PathResult | null>(null);
	private readonly _loading = signal(false);
	private readonly _scheduleReady = signal(false);

	// #endregion
	// #region Lecturas públicas (readonly)

	readonly scheduleItems = this._scheduleItems.asReadonly();
	readonly selectedFloor = this._selectedFloor.asReadonly();
	readonly startNodeId = this._startNodeId.asReadonly();
	readonly destinationNodeId = this._destinationNodeId.asReadonly();
	readonly pathResult = this._pathResult.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly scheduleReady = this._scheduleReady.asReadonly();

	// #endregion
	// #region Computed - Datos derivados

	readonly floors = computed(() => {
		const floorSet = new Set(CAMPUS_NODES.map((n) => n.floor));
		return [...floorSet].sort((a, b) => a - b);
	});

	readonly currentFloorNodes = computed(() =>
		CAMPUS_NODES.filter((n) => n.floor === this._selectedFloor()),
	);

	/**
	 * Mapa salonId → nodeId para vincular horario con nodos del mapa
	 */
	readonly salonToNodeMap = computed(() => {
		const map = new Map<number, string>();
		for (const node of CAMPUS_NODES) {
			if (node.salonId != null) {
				map.set(node.salonId, node.id);
			}
		}
		return map;
	});

	/**
	 * Opciones de dropdown para punto de inicio (todos los nodos navegables)
	 */
	readonly startNodeOptions = computed((): SelectOption[] =>
		CAMPUS_NODES.filter((n) => n.type !== 'corridor').map((n) => ({
			label: `${n.label} (Piso ${n.floor})`,
			value: n.id,
		})),
	);

	/**
	 * Opciones de dropdown para destino (salones, oficinas, baños)
	 */
	readonly destinationNodeOptions = computed((): SelectOption[] =>
		CAMPUS_NODES.filter((n) => ['classroom', 'office', 'bathroom'].includes(n.type)).map(
			(n) => ({
				label: `${n.label} (Piso ${n.floor})`,
				value: n.id,
			}),
		),
	);

	/**
	 * Clase actual o próxima según la hora
	 */
	readonly currentOrNextClass = computed((): MiHorarioHoyItem | null => {
		const items = this._scheduleItems();
		if (items.length === 0) return null;

		const now = new Date();
		const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

		// Buscar clase en curso
		const current = items.find((i) => i.horaInicio <= currentTime && i.horaFin > currentTime);
		if (current) return current;

		// Buscar próxima clase
		const next = items.find((i) => i.horaInicio > currentTime);
		return next ?? null;
	});

	/**
	 * Nodos del path que están en el piso actual (para renderizar la ruta)
	 */
	readonly currentFloorPathNodes = computed((): CampusNode[] => {
		const result = this._pathResult();
		if (!result) return [];

		const floor = this._selectedFloor();
		const nodeMap = new Map(CAMPUS_NODES.map((n) => [n.id, n]));

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
		scheduleReady: this._scheduleReady(),

		floors: this.floors(),
		currentFloorNodes: this.currentFloorNodes(),
		startNodeOptions: this.startNodeOptions(),
		destinationNodeOptions: this.destinationNodeOptions(),
		currentOrNextClass: this.currentOrNextClass(),
		currentFloorPathPoints: this.currentFloorPathPoints(),
		salonToNodeMap: this.salonToNodeMap(),

		hasSchedule: this._scheduleItems().length > 0,
		hasPath: this._pathResult() !== null,
	}));

	// #endregion
	// #region Comandos de mutación

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

	setScheduleReady(ready: boolean): void {
		this._scheduleReady.set(ready);
	}

	clearPath(): void {
		this._destinationNodeId.set(null);
		this._pathResult.set(null);
	}
	// #endregion
}
