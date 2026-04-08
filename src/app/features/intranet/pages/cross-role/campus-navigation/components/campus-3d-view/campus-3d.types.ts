import * as THREE from 'three';
import type { CampusNode } from '../../models';

// #region Constantes
export const SCALE             = 30;
export const ROOM_H            = 3.2;
export const FLOOR_H           = 6.5;
export const EYE_H             = 1.55;
export const MOVE_SPEED        = 2.5;
export const TURN_SPEED        = 1.6;
export const LOOK_SENS         = 0.0022;
export const TOUCH_LOOK_SENS   = 0.004;
export const MAX_PITCH         = 0.9;
export const CORRIDOR_R        = 1.0;
export const PLAYER_R          = 0.35;
export const STAIR_STEPS       = 14;
export const STAIR_LENGTH      = 5.0;
export const STAIR_WIDTH       = 2.2;
export const PATH_OFFSET       = 0.22;
export const NODE_RECALC_MS    = 250;
export const FLOOR_LERP_SPEED  = 8;
export const LABEL_VIEW_DOT    = 0.62;
export const LABEL_VIEW_DIST   = 22;

export const ROOM_COLORS: Record<string, number> = {
	classroom: 0xe8c98a,
	stairs:    0x8B6914,
	entrance:  0x2e7d32,
	patio:     0x4caf50,
	bathroom:  0x0288d1,
	office:    0xf9a825,
};

export const FLOOR_COLORS: Record<string, number> = {
	classroom: 0xc4a96a,
	stairs:    0x5d4037,
	entrance:  0x388e3c,
	patio:     0x558b2f,
	bathroom:  0x0277bd,
	office:    0xf57f17,
};
// #endregion

// #region Tipos geométricos
export interface EdgeSeg  { ax: number; az: number; bx: number; bz: number; floor: number; }
export interface RoomBox  { minX: number; maxX: number; minZ: number; maxZ: number; floor: number; }
export interface LabelEntry { sprite: THREE.Sprite; pos: THREE.Vector3; }

export interface StairZone {
	startX: number; startZ: number;
	endX: number;   endZ: number;
	dirX: number;   dirZ: number;
	len: number;
	floorLow: number; floorHigh: number;
	bidirectional: boolean;
}

export interface Vec2 { x: number; z: number; }
// #endregion

// #region Estado compartido del mundo 3D
export interface WorldData {
	edgeSegs: EdgeSeg[];
	stairZones: StairZone[];
	roomBoxes: RoomBox[];
	labelEntries: LabelEntry[];
	nodeMap: Map<string, CampusNode>;
}

/** Estado mutable del jugador — compartido por referencia entre servicios en cada frame. */
export class PlayerState {
	px = 0; pz = 0;
	yaw = 0; pitch = 0;
	playerFloor  = 0;
	cameraY      = EYE_H;
	inStairZoneNow = false;
	stairExitCooldown = 0;
	spaceWasDown     = false;
	readonly keys: Record<string, boolean> = {};
}

export interface SceneLights {
	ambient: THREE.AmbientLight;
	sun: THREE.DirectionalLight;
	player: THREE.PointLight;
}
// #endregion

// #region Resultados de servicios
export interface PlayerUpdateResult {
	floorChanged?: number;
	stairMsg?: string;
	exitedStair?: boolean;
}

export interface ClosestNodeResult {
	nodeId: string;
	distance: number;
	arrived?: boolean;
	arrivalTimeMs?: number;
}
// #endregion
