import { Injectable } from '@angular/core';
import type { CampusNode } from '@features/intranet/pages/cross-role/campus-navigation/models';
import {
	type StairZone, type Vec2,
	type PlayerState, type WorldData,
	SCALE, CORRIDOR_R, STAIR_WIDTH, FLOOR_H, EYE_H,
} from '../campus-3d.types';

@Injectable()
export class CampusCollisionService {

	resolveMovement(ox: number, oz: number, nx: number, nz: number, player: PlayerState, world: WorldData): Vec2 {
		if (this.isWalkable(nx, nz, player, world)) return { x: nx, z: nz };
		if (this.isWalkable(nx, oz, player, world)) return { x: nx, z: oz };
		if (this.isWalkable(ox, nz, player, world)) return { x: ox, z: nz };
		return { x: ox, z: oz };
	}

	isWalkable(x: number, z: number, player: PlayerState, world: WorldData): boolean {
		if (this.getStairAt(x, z, player, world)) return true;

		let nearEdge = false;
		for (const seg of world.edgeSegs) {
			if (seg.floor !== player.playerFloor) continue;
			if (this.distToSeg(x, z, seg.ax, seg.az, seg.bx, seg.bz) <= CORRIDOR_R) {
				nearEdge = true;
				break;
			}
		}
		if (!nearEdge) return false;

		for (const box of world.roomBoxes) {
			if (box.floor !== player.playerFloor) continue;
			if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) return false;
		}
		return true;
	}

	getStairAt(x: number, z: number, player: PlayerState, world: WorldData): { zone: StairZone; t: number } | null {
		if (performance.now() < player.stairExitCooldown) return null;

		for (const sz of world.stairZones) {
			const toX = x - sz.startX, toZ = z - sz.startZ;
			const proj = toX * sz.dirX + toZ * sz.dirZ;
			const tRaw = proj / sz.len;

			if (tRaw < -0.12 || tRaw > 1.12) continue;

			const clampedProj = Math.max(0, Math.min(sz.len, proj));
			const closestX = sz.startX + sz.dirX * clampedProj;
			const closestZ = sz.startZ + sz.dirZ * clampedProj;
			const lateral  = Math.sqrt((x - closestX) ** 2 + (z - closestZ) ** 2);
			if (lateral > STAIR_WIDTH / 2 + 0.22) continue;

			if (!player.inStairZoneNow) {
				const fromLow  = player.playerFloor === sz.floorLow  && tRaw <= 0.18;
				const fromHigh = player.playerFloor === sz.floorHigh && tRaw >= 0.82;
				if (!fromLow && !fromHigh) continue;
			}

			return { zone: sz, t: Math.max(0, Math.min(1, tRaw)) };
		}
		return null;
	}

	ejectToNearestCorridor(player: PlayerState, world: WorldData, nodes: CampusNode[]): void {
		let bestX = player.px, bestZ = player.pz, bestDist = Infinity;

		for (const n of nodes) {
			if (n.floor !== player.playerFloor) continue;
			if (n.type !== 'corridor') continue;
			const nx = n.x / SCALE, nz = n.y / SCALE;
			const d  = Math.sqrt((player.px - nx) ** 2 + (player.pz - nz) ** 2);
			if (d < bestDist && this.isWalkableForWalls(nx, nz, player.playerFloor, world)) {
				bestDist = d; bestX = nx; bestZ = nz;
			}
		}

		if (bestDist === Infinity) {
			for (const n of nodes) {
				if (n.floor !== player.playerFloor || n.type === 'stairs') continue;
				const nx = n.x / SCALE, nz = n.y / SCALE;
				const d  = Math.sqrt((player.px - nx) ** 2 + (player.pz - nz) ** 2);
				if (d < bestDist) { bestDist = d; bestX = nx; bestZ = nz; }
			}
		}

		if (!this.isWalkableForWalls(bestX, bestZ, player.playerFloor, world)) {
			for (const seg of world.edgeSegs) {
				if (seg.floor !== player.playerFloor) continue;
				const mx = (seg.ax + seg.bx) / 2, mz = (seg.az + seg.bz) / 2;
				if (this.isWalkableForWalls(mx, mz, player.playerFloor, world)) {
					const d = Math.sqrt((player.px - mx) ** 2 + (player.pz - mz) ** 2);
					if (d < bestDist) { bestDist = d; bestX = mx; bestZ = mz; }
				}
			}
		}

		player.px = bestX;
		player.pz = bestZ;
		player.cameraY = player.playerFloor * FLOOR_H + EYE_H;
		player.pitch = 0;
		player.inStairZoneNow    = false;
		player.stairExitCooldown = performance.now() + 1500;
	}

	/** Versión de isWalkable para generación de muros — usa piso explícito, ignora escaleras */
	isWalkableForWalls(x: number, z: number, floor: number, world: WorldData): boolean {
		let nearEdge = false;
		for (const seg of world.edgeSegs) {
			if (seg.floor !== floor) continue;
			if (this.distToSeg(x, z, seg.ax, seg.az, seg.bx, seg.bz) <= CORRIDOR_R) {
				nearEdge = true;
				break;
			}
		}
		if (!nearEdge) {
			for (const sz of world.stairZones) {
				if (sz.floorLow !== floor && sz.floorHigh !== floor) continue;
				const toX = x - sz.startX, toZ = z - sz.startZ;
				const proj = toX * sz.dirX + toZ * sz.dirZ;
				if (proj < -0.5 || proj > sz.len + 0.5) continue;
				const cp = Math.max(0, Math.min(sz.len, proj));
				const cx = sz.startX + sz.dirX * cp, cz = sz.startZ + sz.dirZ * cp;
				if (Math.sqrt((x - cx) ** 2 + (z - cz) ** 2) <= STAIR_WIDTH / 2 + 0.3) return true;
			}
			return false;
		}
		for (const box of world.roomBoxes) {
			if (box.floor !== floor) continue;
			if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) return false;
		}
		return true;
	}

	distToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
		const dx = bx - ax, dz = bz - az;
		const lenSq = dx * dx + dz * dz;
		if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2);
		const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
		return Math.sqrt((px - ax - t * dx) ** 2 + (pz - az - t * dz) ** 2);
	}
}
