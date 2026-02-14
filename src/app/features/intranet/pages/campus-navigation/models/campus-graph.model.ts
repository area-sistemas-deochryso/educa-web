// #region Node Types

export type CampusNodeType =
	| 'classroom'
	| 'corridor'
	| 'stairs'
	| 'entrance'
	| 'patio'
	| 'bathroom'
	| 'office';

export interface CampusNode {
	id: string;
	type: CampusNodeType;
	label: string;
	floor: number;
	x: number;
	y: number;
	width?: number;
	height?: number;
	salonId?: number;
}

export interface CampusEdge {
	from: string;
	to: string;
	distance: number;
	bidirectional: boolean;
}

export interface BlockedPath {
	from: string;
	to: string;
	reason: string;
	temporary: boolean;
}

// #endregion
// #region Pathfinding Results

export interface PathResult {
	path: string[];
	totalDistance: number;
	steps: NavigationStep[];
}

export interface NavigationStep {
	fromNodeId: string;
	toNodeId: string;
	fromLabel: string;
	toLabel: string;
	floor: number;
	instruction: string;
	floorChange: boolean;
}
// #endregion
