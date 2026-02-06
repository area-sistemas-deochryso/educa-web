import { Injectable } from '@angular/core';

import {
	BlockedPath,
	CampusEdge,
	CampusNode,
	NavigationStep,
	PathResult,
} from '../models';

interface AdjacencyEntry {
	nodeId: string;
	distance: number;
}

interface AStarNode {
	id: string;
	g: number;
	f: number;
	parent: string | null;
}

interface Point {
	x: number;
	y: number;
}

interface ObstacleRect {
	cx: number;
	cy: number;
	w: number;
	h: number;
}

/** Padding alrededor de cada rectángulo para evitar que la línea roce los bordes */
const COLLISION_PADDING = 8;

/**
 * Servicio de pathfinding A* para navegación en campus.
 * Pure utility: no guarda estado, solo calcula rutas.
 */
@Injectable({ providedIn: 'root' })
export class PathfindingService {
	// ============ API Pública ============

	findPath(
		startId: string,
		endId: string,
		nodes: CampusNode[],
		edges: CampusEdge[],
		blockedPaths: BlockedPath[],
	): PathResult | null {
		if (startId === endId) return null;

		const nodeMap = new Map(nodes.map((n) => [n.id, n]));
		if (!nodeMap.has(startId) || !nodeMap.has(endId)) return null;

		const adjacency = this.buildAdjacencyList(edges, blockedPaths);
		const path = this.astar(startId, endId, nodeMap, adjacency);

		if (!path) return null;

		const totalDistance = this.calculateTotalDistance(path, adjacency);
		const steps = this.generateSteps(path, nodeMap);

		return { path, totalDistance, steps };
	}

	// ============ A* Algorithm ============

	private astar(
		startId: string,
		endId: string,
		nodeMap: Map<string, CampusNode>,
		adjacency: Map<string, AdjacencyEntry[]>,
	): string[] | null {
		const endNode = nodeMap.get(endId)!;

		const openSet: AStarNode[] = [{ id: startId, g: 0, f: 0, parent: null }];
		const closedSet = new Set<string>();
		const cameFrom = new Map<string, string>();
		const gScore = new Map<string, number>();
		gScore.set(startId, 0);

		while (openSet.length > 0) {
			// Sacar nodo con menor f
			openSet.sort((a, b) => a.f - b.f);
			const current = openSet.shift()!;

			if (current.id === endId) {
				return this.reconstructPath(cameFrom, endId);
			}

			closedSet.add(current.id);

			const neighbors = adjacency.get(current.id) || [];
			for (const neighbor of neighbors) {
				if (closedSet.has(neighbor.nodeId)) continue;

				const tentativeG = current.g + neighbor.distance;
				const existingG = gScore.get(neighbor.nodeId) ?? Infinity;

				if (tentativeG < existingG) {
					cameFrom.set(neighbor.nodeId, current.id);
					gScore.set(neighbor.nodeId, tentativeG);

					const neighborNode = nodeMap.get(neighbor.nodeId);
					const h = neighborNode ? this.heuristic(neighborNode, endNode) : 0;

					const existing = openSet.find((n) => n.id === neighbor.nodeId);
					if (existing) {
						existing.g = tentativeG;
						existing.f = tentativeG + h;
						existing.parent = current.id;
					} else {
						openSet.push({
							id: neighbor.nodeId,
							g: tentativeG,
							f: tentativeG + h,
							parent: current.id,
						});
					}
				}
			}
		}

		return null;
	}

	/**
	 * Heurística: Distancia euclidiana + penalización por cambio de piso.
	 * La penalización simula el tiempo extra de subir/bajar escaleras.
	 */
	private heuristic(a: CampusNode, b: CampusNode): number {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		const euclidean = Math.sqrt(dx * dx + dy * dy) / 50;
		const floorPenalty = Math.abs(a.floor - b.floor) * 200;
		return euclidean + floorPenalty;
	}

	private reconstructPath(cameFrom: Map<string, string>, endId: string): string[] {
		const path: string[] = [endId];
		let current = endId;

		while (cameFrom.has(current)) {
			current = cameFrom.get(current)!;
			path.unshift(current);
		}

		return path;
	}

	// ============ Graph Construction ============

	private buildAdjacencyList(
		edges: CampusEdge[],
		blockedPaths: BlockedPath[],
	): Map<string, AdjacencyEntry[]> {
		const blocked = new Set(
			blockedPaths.flatMap((bp) => [`${bp.from}→${bp.to}`, `${bp.to}→${bp.from}`]),
		);

		const adjacency = new Map<string, AdjacencyEntry[]>();

		for (const edge of edges) {
			if (!blocked.has(`${edge.from}→${edge.to}`)) {
				const fromList = adjacency.get(edge.from) || [];
				fromList.push({ nodeId: edge.to, distance: edge.distance });
				adjacency.set(edge.from, fromList);
			}

			if (edge.bidirectional && !blocked.has(`${edge.to}→${edge.from}`)) {
				const toList = adjacency.get(edge.to) || [];
				toList.push({ nodeId: edge.from, distance: edge.distance });
				adjacency.set(edge.to, toList);
			}
		}

		return adjacency;
	}

	// ============ Result Generation ============

	private calculateTotalDistance(
		path: string[],
		adjacency: Map<string, AdjacencyEntry[]>,
	): number {
		let total = 0;

		for (let i = 0; i < path.length - 1; i++) {
			const neighbors = adjacency.get(path[i]) || [];
			const edge = neighbors.find((n) => n.nodeId === path[i + 1]);
			if (edge) total += edge.distance;
		}

		return total;
	}

	private generateSteps(path: string[], nodeMap: Map<string, CampusNode>): NavigationStep[] {
		const steps: NavigationStep[] = [];

		for (let i = 0; i < path.length - 1; i++) {
			const from = nodeMap.get(path[i])!;
			const to = nodeMap.get(path[i + 1])!;
			const floorChange = from.floor !== to.floor;

			let instruction: string;
			if (floorChange) {
				const direction = to.floor > from.floor ? 'Sube' : 'Baja';
				instruction = `${direction} escaleras al Piso ${to.floor}`;
			} else if (i === path.length - 2) {
				instruction = `Llega a ${to.label}`;
			} else if (to.type === 'corridor') {
				instruction = `Camina por ${to.label}`;
			} else {
				instruction = `Camina hacia ${to.label}`;
			}

			steps.push({
				fromNodeId: from.id,
				toNodeId: to.id,
				fromLabel: from.label,
				toLabel: to.label,
				floor: floorChange ? to.floor : from.floor,
				instruction,
				floorChange,
			});
		}

		return steps;
	}

	// ============ Collision Avoidance (auto-corrección visual) ============

	/**
	 * Genera puntos de polyline SVG que evitan cruzar rectángulos de nodos.
	 * Cuando una línea directa entre dos nodos del path cruzaría un salón/oficina/baño,
	 * se redirige automáticamente por la banda horizontal de pasillos más cercana.
	 *
	 * Esto garantiza que incluso con posiciones mal configuradas, la ruta
	 * nunca atraviesa visualmente un rectángulo de salón.
	 */
	generateSafePathPoints(pathNodes: CampusNode[], allFloorNodes: CampusNode[]): string {
		if (pathNodes.length < 2) return '';

		const obstacles = this.buildObstacleRects(pathNodes, allFloorNodes);
		const corridorYs = this.extractCorridorYValues(allFloorNodes);

		const points: Point[] = [{ x: pathNodes[0].x, y: pathNodes[0].y }];

		for (let i = 0; i < pathNodes.length - 1; i++) {
			const from: Point = { x: pathNodes[i].x, y: pathNodes[i].y };
			const to: Point = { x: pathNodes[i + 1].x, y: pathNodes[i + 1].y };

			const safeRoute = this.findSafeRoute(from, to, obstacles, corridorYs);

			// Skip el primer punto (ya está en la lista como 'from')
			for (let j = 1; j < safeRoute.length; j++) {
				points.push(safeRoute[j]);
			}
		}

		return points.map((p) => `${p.x},${p.y}`).join(' ');
	}

	/**
	 * Construye rectángulos de obstáculo a partir de nodos con dimensiones.
	 * Excluye corredores (son puntos) y nodos que forman parte del path actual.
	 */
	private buildObstacleRects(pathNodes: CampusNode[], allFloorNodes: CampusNode[]): ObstacleRect[] {
		const pathIds = new Set(pathNodes.map((n) => n.id));

		return allFloorNodes
			.filter((n) => n.type !== 'corridor' && n.width && n.height && !pathIds.has(n.id))
			.map((n) => ({
				cx: n.x,
				cy: n.y,
				w: (n.width ?? 0) + COLLISION_PADDING * 2,
				h: (n.height ?? 0) + COLLISION_PADDING * 2,
			}));
	}

	private extractCorridorYValues(allFloorNodes: CampusNode[]): number[] {
		const ys = new Set(allFloorNodes.filter((n) => n.type === 'corridor').map((n) => n.y));
		return [...ys].sort((a, b) => a - b);
	}

	/**
	 * Encuentra una ruta segura entre dos puntos.
	 * Si la línea directa no cruza obstáculos, retorna la línea directa.
	 * Si cruza, intenta enrutar por la banda horizontal de pasillos (L-route).
	 */
	private findSafeRoute(
		from: Point,
		to: Point,
		obstacles: ObstacleRect[],
		corridorYs: number[],
	): Point[] {
		if (!this.lineHitsAnyObstacle(from, to, obstacles)) {
			return [from, to];
		}

		// Intentar L-route por cada Y de pasillo, ordenado por cercanía al punto medio
		const midY = (from.y + to.y) / 2;
		const sortedYs = [...corridorYs].sort((a, b) => Math.abs(a - midY) - Math.abs(b - midY));

		for (const safeY of sortedYs) {
			const mid1: Point = { x: from.x, y: safeY };
			const mid2: Point = { x: to.x, y: safeY };

			const allClear =
				!this.lineHitsAnyObstacle(from, mid1, obstacles) &&
				!this.lineHitsAnyObstacle(mid1, mid2, obstacles) &&
				!this.lineHitsAnyObstacle(mid2, to, obstacles);

			if (allClear) {
				const route: Point[] = [from];
				if (mid1.x !== from.x || mid1.y !== from.y) route.push(mid1);
				if (mid2.x !== mid1.x || mid2.y !== mid1.y) route.push(mid2);
				route.push(to);
				return route;
			}
		}

		// Fallback: línea directa (no debería pasar con layout bien diseñado)
		return [from, to];
	}

	// ============ Geometría: detección de intersección línea-rectángulo ============

	private lineHitsAnyObstacle(from: Point, to: Point, obstacles: ObstacleRect[]): boolean {
		return obstacles.some((r) => this.lineIntersectsRect(from, to, r));
	}

	/**
	 * Detecta si un segmento de línea cruza un rectángulo (centrado en cx,cy).
	 * Usa test de intersección segmento-segmento contra los 4 bordes del rectángulo,
	 * más verificación de puntos interiores.
	 */
	private lineIntersectsRect(p1: Point, p2: Point, rect: ObstacleRect): boolean {
		const left = rect.cx - rect.w / 2;
		const right = rect.cx + rect.w / 2;
		const top = rect.cy - rect.h / 2;
		const bottom = rect.cy + rect.h / 2;

		if (this.pointInRect(p1, left, top, right, bottom) || this.pointInRect(p2, left, top, right, bottom)) {
			return true;
		}

		const tl: Point = { x: left, y: top };
		const tr: Point = { x: right, y: top };
		const bl: Point = { x: left, y: bottom };
		const br: Point = { x: right, y: bottom };

		return (
			this.segmentsCross(p1, p2, tl, tr) ||
			this.segmentsCross(p1, p2, bl, br) ||
			this.segmentsCross(p1, p2, tl, bl) ||
			this.segmentsCross(p1, p2, tr, br)
		);
	}

	private pointInRect(p: Point, left: number, top: number, right: number, bottom: number): boolean {
		return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
	}

	/**
	 * Test de intersección de dos segmentos usando productos cruz.
	 */
	private segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
		const d1 = this.crossProduct(c, d, a);
		const d2 = this.crossProduct(c, d, b);
		const d3 = this.crossProduct(a, b, c);
		const d4 = this.crossProduct(a, b, d);

		if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
			return true;
		}

		if (d1 === 0 && this.onSegment(c, d, a)) return true;
		if (d2 === 0 && this.onSegment(c, d, b)) return true;
		if (d3 === 0 && this.onSegment(a, b, c)) return true;
		if (d4 === 0 && this.onSegment(a, b, d)) return true;

		return false;
	}

	private crossProduct(o: Point, a: Point, b: Point): number {
		return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	}

	private onSegment(p: Point, q: Point, r: Point): boolean {
		return (
			r.x <= Math.max(p.x, q.x) &&
			r.x >= Math.min(p.x, q.x) &&
			r.y <= Math.max(p.y, q.y) &&
			r.y >= Math.min(p.y, q.y)
		);
	}
}
