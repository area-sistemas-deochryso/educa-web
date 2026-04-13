import { Injectable } from '@angular/core';
import type { CampusNode, PathResult } from '@features/intranet/pages/cross-role/campus-navigation/models';
import {
	type PlayerState, type WorldData,
	SCALE, ROOM_COLORS,
} from '../campus-3d.types';

export interface MinimapDrawParams {
	width: number; height: number;
	nodes: CampusNode[];
	world: WorldData;
	pathResult: PathResult | null;
	destinationNodeId: string | null;
	player: PlayerState;
}

@Injectable()
export class CampusMinimapService {

	draw(ctx: CanvasRenderingContext2D, p: MinimapDrawParams): void {
		const { width: W, height: H, nodes, world, pathResult, destinationNodeId, player } = p;
		const PAD = 10;

		const floorNodes = nodes.filter((n) => n.floor === player.playerFloor);
		ctx.clearRect(0, 0, W, H);
		ctx.fillStyle = 'rgba(240,236,228,0.95)';
		ctx.fillRect(0, 0, W, H);
		if (!floorNodes.length) return;

		let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
		for (const n of floorNodes) {
			minX = Math.min(minX, n.x); minZ = Math.min(minZ, n.y);
			maxX = Math.max(maxX, n.x); maxZ = Math.max(maxZ, n.y);
		}
		for (const sz of world.stairZones) {
			if (sz.floorLow !== player.playerFloor && sz.floorHigh !== player.playerFloor) continue;
			minX = Math.min(minX, sz.startX * SCALE - 5, sz.endX * SCALE - 5);
			maxX = Math.max(maxX, sz.startX * SCALE + 5, sz.endX * SCALE + 5);
			minZ = Math.min(minZ, sz.startZ * SCALE - 5, sz.endZ * SCALE - 5);
			maxZ = Math.max(maxZ, sz.startZ * SCALE + 5, sz.endZ * SCALE + 5);
		}

		const rX = maxX - minX || 1, rZ = maxZ - minZ || 1;
		const toMx = (x: number): number => PAD + ((x - minX) / rX) * (W - PAD * 2);
		const toMz = (z: number): number => PAD + ((z - minZ) / rZ) * (H - PAD * 2);

		// Edges
		for (const seg of world.edgeSegs.filter((s) => s.floor === player.playerFloor)) {
			ctx.beginPath();
			ctx.strokeStyle = 'rgba(100,130,180,0.65)';
			ctx.lineWidth = 3;
			ctx.moveTo(toMx(seg.ax * SCALE), toMz(seg.az * SCALE));
			ctx.lineTo(toMx(seg.bx * SCALE), toMz(seg.bz * SCALE));
			ctx.stroke();
		}

		// Stairs
		for (const sz of world.stairZones) {
			if (sz.floorLow !== player.playerFloor && sz.floorHigh !== player.playerFloor) continue;
			ctx.beginPath();
			ctx.strokeStyle = '#b45309';
			ctx.lineWidth = 3.5;
			ctx.moveTo(toMx(sz.startX * SCALE), toMz(sz.startZ * SCALE));
			ctx.lineTo(toMx(sz.endX   * SCALE), toMz(sz.endZ   * SCALE));
			ctx.stroke();
			ctx.fillStyle = '#f59e0b';
			ctx.font = '10px system-ui';
			ctx.fillText('⬆', toMx(sz.startX * SCALE) - 5, toMz(sz.startZ * SCALE) + 4);
		}

		// Path
		if (pathResult && pathResult.path.length > 1) {
			ctx.beginPath();
			ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 2.5;
			let first = true, prevOnFloor = false;
			for (const id of pathResult.path) {
				const n = world.nodeMap.get(id);
				const onFloor = n != null && n.floor === player.playerFloor;
				if (!onFloor) { if (prevOnFloor) first = true; prevOnFloor = false; continue; }
				if (first) { ctx.moveTo(toMx(n.x), toMz(n.y)); first = false; }
				else        { ctx.lineTo(toMx(n.x), toMz(n.y)); }
				prevOnFloor = true;
			}
			ctx.stroke();
		}

		// Rooms
		for (const n of floorNodes) {
			if (n.type === 'corridor') continue;
			const color = '#' + (ROOM_COLORS[n.type] ?? 0xd4c4a8).toString(16).padStart(6, '0');
			ctx.fillStyle = color + 'cc';
			const w = Math.max(5, (n.width  ?? 80) / rX * (W - PAD * 2));
			const h = Math.max(4, (n.height ?? 50) / rZ * (H - PAD * 2));
			ctx.fillRect(toMx(n.x) - w / 2, toMz(n.y) - h / 2, w, h);
			ctx.strokeStyle = color; ctx.lineWidth = 1.5;
			ctx.strokeRect(toMx(n.x) - w / 2, toMz(n.y) - h / 2, w, h);
		}

		// Destination
		if (destinationNodeId) {
			const dn = world.nodeMap.get(destinationNodeId);
			if (dn && dn.floor === player.playerFloor) {
				ctx.beginPath();
				ctx.fillStyle = '#dc2626';
				ctx.arc(toMx(dn.x), toMz(dn.y), 5.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
			}
		}

		// Player vision cone
		const pmx = toMx(player.px * SCALE), pmz = toMz(player.pz * SCALE);
		ctx.save();
		ctx.translate(pmx, pmz);
		ctx.rotate(-player.yaw - Math.PI / 2);
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.arc(0, 0, 16, -Math.PI / 4, Math.PI / 4);
		ctx.closePath();
		ctx.fillStyle = 'rgba(79,70,229,0.22)'; ctx.fill();
		ctx.restore();

		ctx.beginPath();
		ctx.fillStyle = '#4f46e5'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
		ctx.arc(pmx, pmz, 5, 0, Math.PI * 2);
		ctx.fill(); ctx.stroke();
	}
}
