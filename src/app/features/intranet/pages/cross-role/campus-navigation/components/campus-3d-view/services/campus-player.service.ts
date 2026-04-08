import { inject, Injectable } from '@angular/core';
import * as THREE from 'three';
import type { CampusNode } from '../../../models';
import {
	type PlayerState, type WorldData, type LabelEntry,
	type PlayerUpdateResult, type ClosestNodeResult,
	SCALE, FLOOR_H, EYE_H, MOVE_SPEED, TURN_SPEED, FLOOR_LERP_SPEED,
	NODE_RECALC_MS, LABEL_VIEW_DOT, LABEL_VIEW_DIST,
} from '../campus-3d.types';
import { CampusCollisionService } from './campus-collision.service';

@Injectable()
export class CampusPlayerService {
	private readonly collision = inject(CampusCollisionService);

	// Vectores reutilizables para label visibility (evitar GC)
	private readonly _camDir   = new THREE.Vector3();
	private readonly _toSprite = new THREE.Vector3();

	placePlayerAtStart(
		player: PlayerState,
		nodes: CampusNode[],
		startNodeId: string | null,
		destNodeId: string | null,
	): void {
		const startNode = startNodeId ? nodes.find((n) => n.id === startNodeId) : null;
		const refNode   = startNode ?? nodes.find((n) => n.type !== 'corridor') ?? nodes[0];
		if (!refNode) return;

		const corridors = nodes.filter((n) => n.type === 'corridor' && n.floor === refNode.floor);
		let spawn = refNode;
		if (corridors.length > 0) {
			let minD = Infinity;
			for (const c of corridors) {
				const d = (c.x - refNode.x) ** 2 + (c.y - refNode.y) ** 2;
				if (d < minD) { minD = d; spawn = c; }
			}
		}

		player.playerFloor = spawn.floor;
		player.px = spawn.x / SCALE;
		player.pz = spawn.y / SCALE;
		player.cameraY = player.playerFloor * FLOOR_H + EYE_H;
		player.inStairZoneNow = false;

		const lookAt = refNode !== spawn
			? refNode
			: (destNodeId ? nodes.find((n) => n.id === destNodeId) : null);
		if (lookAt) {
			player.yaw = Math.atan2(-(lookAt.x / SCALE - player.px), -(lookAt.y / SCALE - player.pz));
		}
		player.pitch = -0.05;
	}

	updatePlayer(
		dt: number,
		player: PlayerState,
		world: WorldData,
		joyDelta: { x: number; y: number },
	): PlayerUpdateResult {
		const result: PlayerUpdateResult = {};

		// Giro lateral
		if (player.keys['a'] || player.keys['arrowleft'])  player.yaw += TURN_SPEED * dt;
		if (player.keys['d'] || player.keys['arrowright']) player.yaw -= TURN_SPEED * dt;

		// Espacio (edge-triggered)
		const spaceDown = !!player.keys[' '];
		if (spaceDown && !player.spaceWasDown) {
			this.collision.ejectToNearestCorridor(player, world, Array.from(world.nodeMap.values()));
		}
		player.spaceWasDown = spaceDown;

		const stairNow = this.collision.getStairAt(player.px, player.pz, player, world);

		if (stairNow) {
			player.inStairZoneNow = true;
			const { zone, t } = stairNow;
			let tDelta = 0;
			if (player.keys['w'] || player.keys['arrowup'])   tDelta += 1;
			if (player.keys['s'] || player.keys['arrowdown']) tDelta -= 1;
			if (joyDelta.y !== 0) tDelta += joyDelta.y;

			if (tDelta !== 0) {
				const rawNewT = t + tDelta * (MOVE_SPEED * dt) / zone.len;
				const targetPitch = tDelta > 0 ? -0.2 : 0.2;
				player.pitch += (targetPitch - player.pitch) * Math.min(1, 3 * dt);

				if (rawNewT < 0) {
					player.playerFloor = zone.floorLow;
					result.floorChanged = zone.floorLow;
					player.cameraY = zone.floorLow * FLOOR_H + EYE_H;
					player.px = zone.startX; player.pz = zone.startZ;
					player.inStairZoneNow = false;
					player.stairExitCooldown = performance.now() + 350;
					result.stairMsg = '';
					if (!this.collision.isWalkableForWalls(player.px, player.pz, player.playerFloor, world)) {
						this.collision.ejectToNearestCorridor(player, world, Array.from(world.nodeMap.values()));
					}
				} else if (rawNewT > 1) {
					player.playerFloor = zone.floorHigh;
					result.floorChanged = zone.floorHigh;
					player.cameraY = zone.floorHigh * FLOOR_H + EYE_H;
					player.px = zone.endX; player.pz = zone.endZ;
					player.inStairZoneNow = false;
					player.stairExitCooldown = performance.now() + 350;
					result.stairMsg = '';
					if (!this.collision.isWalkableForWalls(player.px, player.pz, player.playerFloor, world)) {
						this.collision.ejectToNearestCorridor(player, world, Array.from(world.nodeMap.values()));
					}
				} else {
					player.px = zone.startX + zone.dirX * rawNewT * zone.len;
					player.pz = zone.startZ + zone.dirZ * rawNewT * zone.len;
				}
			}

			if (player.inStairZoneNow) {
				const curT = this.collision.getStairAt(player.px, player.pz, player, world)?.t ?? t;
				const targetCamY = THREE.MathUtils.lerp(
					zone.floorLow  * FLOOR_H + EYE_H,
					zone.floorHigh * FLOOR_H + EYE_H,
					curT,
				);
				player.cameraY += (targetCamY - player.cameraY) * Math.min(1, 18 * dt);

				const newFloor = curT < 0.5 ? zone.floorLow : zone.floorHigh;
				if (newFloor !== player.playerFloor) {
					player.playerFloor = newFloor;
					result.floorChanged = newFloor;
				}

				result.stairMsg = '⬆ W/↑ Subir  |  ⬇ S/↓ Bajar';
			}
		} else {
			if (player.inStairZoneNow) {
				player.inStairZoneNow = false;
				result.stairMsg = '';
				result.exitedStair = true;
				player.pitch = 0;
			}

			const sinY = Math.sin(player.yaw), cosY = Math.cos(player.yaw);
			let mx = 0, mz = 0;

			if (player.keys['w'] || player.keys['arrowup'])   { mx -= sinY; mz -= cosY; }
			if (player.keys['s'] || player.keys['arrowdown']) { mx += sinY; mz += cosY; }
			if (joyDelta.y !== 0) { mx -= sinY * joyDelta.y; mz -= cosY * joyDelta.y; }
			if (joyDelta.x !== 0) { mx +=  cosY * joyDelta.x; mz += -sinY * joyDelta.x; }

			if (mx !== 0 || mz !== 0) {
				const len   = Math.sqrt(mx * mx + mz * mz);
				const speed = MOVE_SPEED * dt;
				const ndx   = (mx / len) * speed;
				const ndz   = (mz / len) * speed;
				const r     = this.collision.resolveMovement(player.px, player.pz, player.px + ndx, player.pz + ndz, player, world);
				player.px = r.x; player.pz = r.z;
			}

			const targetY = player.playerFloor * FLOOR_H + EYE_H;
			player.cameraY += (targetY - player.cameraY) * Math.min(1, FLOOR_LERP_SPEED * dt);
		}

		return result;
	}

	updateLabelVisibility(camera: THREE.PerspectiveCamera, labels: LabelEntry[]): void {
		camera.getWorldDirection(this._camDir);
		for (const entry of labels) {
			this._toSprite.subVectors(entry.pos, camera.position);
			const dist = this._toSprite.length();
			this._toSprite.divideScalar(dist || 1);
			const dot = this._camDir.dot(this._toSprite);
			const target = (dot > LABEL_VIEW_DOT && dist < LABEL_VIEW_DIST) ? 1.0 : 0.0;
			const mat = entry.sprite.material as THREE.SpriteMaterial;
			mat.opacity += (target - mat.opacity) * 0.12;
		}
	}

	checkClosestNode(
		player: PlayerState,
		nodes: CampusNode[],
		lastRecalcTime: number,
		destNodeId: string | null,
		navStartTime: number,
		alreadyArrived: boolean,
	): ClosestNodeResult | null {
		const now = performance.now();
		if (now - lastRecalcTime < NODE_RECALC_MS) return null;

		let nearest: CampusNode | null = null;
		let minD = Infinity;
		for (const n of nodes) {
			if (n.floor !== player.playerFloor) continue;
			const dx = n.x / SCALE - player.px;
			const dz = n.y / SCALE - player.pz;
			const d  = dx * dx + dz * dz;
			if (d < minD) { minD = d; nearest = n; }
		}

		if (!nearest) return null;

		const result: ClosestNodeResult = {
			nodeId: nearest.id,
			distance: Math.sqrt(minD),
		};

		if (destNodeId && nearest.id === destNodeId && result.distance < 3 && !alreadyArrived) {
			result.arrived = true;
			result.arrivalTimeMs = now - navStartTime;
		}

		return result;
	}
}
