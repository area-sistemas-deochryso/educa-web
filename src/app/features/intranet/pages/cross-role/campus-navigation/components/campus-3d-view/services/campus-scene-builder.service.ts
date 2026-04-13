import { inject, Injectable } from '@angular/core';
import * as THREE from 'three';
import type { CampusNode, CampusEdge } from '@features/intranet/pages/cross-role/campus-navigation/models';
import {
	type WorldData, type EdgeSeg, type StairZone, type RoomBox, type LabelEntry,
	SCALE, ROOM_H, FLOOR_H, CORRIDOR_R, PLAYER_R, STAIR_STEPS, STAIR_LENGTH,
	ROOM_COLORS, FLOOR_COLORS,
} from '../campus-3d.types';
import { CampusCollisionService } from './campus-collision.service';
import { buildStairGroup } from './campus-stair-builder';
import { makeLabelSprite } from './campus-label.helper';

@Injectable()
export class CampusSceneBuilderService {
	private readonly collision = inject(CampusCollisionService);

	buildScene(scene: THREE.Scene, nodes: CampusNode[], edges: CampusEdge[]): WorldData {
		// Limpiar meshes previos
		const toRemove = scene.children.filter((c) => c.userData['managed']);
		toRemove.forEach((c) => scene.remove(c));

		const nodeMap      = new Map(nodes.map((n) => [n.id, n]));
		const edgeSegs:    EdgeSeg[]    = [];
		const stairZones:  StairZone[]  = [];
		const roomBoxes:   RoomBox[]    = [];
		const labelEntries: LabelEntry[] = [];

		const addManaged = (mesh: THREE.Object3D): void => {
			mesh.userData = { managed: true };
			scene.add(mesh);
		};

		const floors = [...new Set(nodes.map((n) => n.floor))].sort((a, b) => a - b);

		// Partial world for isWalkableForWalls during build
		const world: WorldData = { edgeSegs, stairZones, roomBoxes, labelEntries, nodeMap };

		// #region Suelo + techo por piso
		for (const floor of floors) {
			const fn = nodes.filter((n) => n.floor === floor);
			if (!fn.length) continue;
			const xs = fn.map((n) => n.x / SCALE), zs = fn.map((n) => n.y / SCALE);
			const pad = 5;
			const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
			const minZ = Math.min(...zs) - pad, maxZ = Math.max(...zs) + pad;
			const fw = maxX - minX, fd = maxZ - minZ;
			const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
			const fy = floor * FLOOR_H;

			const floorMesh = new THREE.Mesh(
				new THREE.PlaneGeometry(fw, fd),
				new THREE.MeshLambertMaterial({ color: floor % 2 === 0 ? 0xd4c4a8 : 0xc8b89a }),
			);
			floorMesh.rotation.x = -Math.PI / 2;
			floorMesh.position.set(cx, fy - 0.01, cz);
			floorMesh.receiveShadow = true;
			addManaged(floorMesh);

			const ceilMesh = new THREE.Mesh(
				new THREE.PlaneGeometry(fw, fd),
				new THREE.MeshLambertMaterial({ color: 0xf5f0e8, side: THREE.BackSide }),
			);
			ceilMesh.rotation.x = Math.PI / 2;
			ceilMesh.position.set(cx, fy + ROOM_H + 0.1, cz);
			addManaged(ceilMesh);

			const fl = new THREE.PointLight(0xfff8e1, 0.6, Math.max(fw, fd) * 1.1);
			fl.position.set(cx, fy + ROOM_H - 0.3, cz);
			fl.userData = { managed: true };
			scene.add(fl);
		}
		// #endregion

		// #region EdgeSegs mismo piso
		for (const edge of edges) {
			const fromNode = nodeMap.get(edge.from);
			const toNode   = nodeMap.get(edge.to);
			if (!fromNode || !toNode || fromNode.floor !== toNode.floor) continue;
			edgeSegs.push({
				ax: fromNode.x / SCALE, az: fromNode.y / SCALE,
				bx: toNode.x   / SCALE, bz: toNode.y   / SCALE,
				floor: fromNode.floor,
			});
		}
		// #endregion

		// #region Habitaciones
		for (const node of nodes) {
			if (node.type === 'corridor') continue;
			const fy = node.floor * FLOOR_H;
			const cx = node.x / SCALE, cz = node.y / SCALE;
			const hw = (node.width  ?? 80) / SCALE / 2;
			const hh = (node.height ?? 50) / SCALE / 2;
			const color      = ROOM_COLORS[node.type]  ?? 0xd4c4a8;
			const floorColor = FLOOR_COLORS[node.type] ?? 0xc4a96a;

			const wall = new THREE.Mesh(
				new THREE.BoxGeometry(hw * 2, ROOM_H, hh * 2),
				new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.88 }),
			);
			wall.position.set(cx, fy + ROOM_H / 2, cz);
			wall.castShadow = true; wall.receiveShadow = true;
			addManaged(wall);

			if (node.type === 'classroom') {
				this.addWindowDetails(cx, cz, fy, hw, hh, addManaged);
			}

			const rf = new THREE.Mesh(
				new THREE.PlaneGeometry(hw * 2 - 0.1, hh * 2 - 0.1),
				new THREE.MeshLambertMaterial({ color: floorColor }),
			);
			rf.rotation.x = -Math.PI / 2;
			rf.position.set(cx, fy + 0.01, cz);
			addManaged(rf);

			const spritePos = new THREE.Vector3(cx, fy + ROOM_H + 0.8, cz);
			const sprite = this.makeLabel(node.label, color);
			sprite.position.copy(spritePos);
			(sprite.material as THREE.SpriteMaterial).opacity = 0;
			addManaged(sprite);
			labelEntries.push({ sprite, pos: spritePos });

			roomBoxes.push({
				minX: cx - hw + PLAYER_R, maxX: cx + hw - PLAYER_R,
				minZ: cz - hh + PLAYER_R, maxZ: cz + hh - PLAYER_R,
				floor: node.floor,
			});
		}
		// #endregion

		// #region Corredores
		const corridorFloorMat = new THREE.MeshLambertMaterial({ color: 0xbcb0a0 });
		const guideWallMat = new THREE.MeshLambertMaterial({ color: 0xd8cfc4 });

		for (const seg of edgeSegs) {
			const dx = seg.bx - seg.ax, dz = seg.bz - seg.az;
			const len = Math.sqrt(dx * dx + dz * dz);
			if (len < 0.05) continue;

			const cx = (seg.ax + seg.bx) / 2, cz = (seg.az + seg.bz) / 2;
			const fy = seg.floor * FLOOR_H;

			const group = new THREE.Group();
			group.position.set(cx, fy, cz);
			group.rotation.y = Math.atan2(dx, dz);
			group.userData = { managed: true };

			const floorStrip = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_R * 2.0, len), corridorFloorMat);
			floorStrip.rotation.x = -Math.PI / 2;
			floorStrip.position.y = 0.015;
			group.add(floorStrip);

			scene.add(group);
		}

		// Guide walls
		const GRID_STEP = 0.5;
		for (const floor of floors) {
			const fn = nodes.filter((n) => n.floor === floor);
			if (!fn.length) continue;
			const xs = fn.map((n) => n.x / SCALE), zs = fn.map((n) => n.y / SCALE);
			const pad = CORRIDOR_R + 2;
			const gMinX = Math.min(...xs) - pad, gMaxX = Math.max(...xs) + pad;
			const gMinZ = Math.min(...zs) - pad, gMaxZ = Math.max(...zs) + pad;
			const fy = floor * FLOOR_H;

			const cols = Math.ceil((gMaxX - gMinX) / GRID_STEP);
			const rows = Math.ceil((gMaxZ - gMinZ) / GRID_STEP);
			const grid: boolean[] = new Array(cols * rows);

			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const px = gMinX + c * GRID_STEP + GRID_STEP / 2;
					const pz = gMinZ + r * GRID_STEP + GRID_STEP / 2;
					grid[r * cols + c] = this.collision.isWalkableForWalls(px, pz, floor, world);
				}
			}

			const pillarGeo = new THREE.BoxGeometry(GRID_STEP, ROOM_H, GRID_STEP);
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					if (grid[r * cols + c]) continue;
					let adj = false;
					if (c > 0 && grid[r * cols + (c - 1)]) adj = true;
					if (c < cols - 1 && grid[r * cols + (c + 1)]) adj = true;
					if (r > 0 && grid[(r - 1) * cols + c]) adj = true;
					if (r < rows - 1 && grid[(r + 1) * cols + c]) adj = true;
					if (!adj) continue;

					const wx = gMinX + c * GRID_STEP + GRID_STEP / 2;
					const wz = gMinZ + r * GRID_STEP + GRID_STEP / 2;
					const pillar = new THREE.Mesh(pillarGeo, guideWallMat);
					pillar.position.set(wx, fy + ROOM_H / 2, wz);
					pillar.userData = { managed: true };
					scene.add(pillar);
				}
			}
		}
		// #endregion

		// #region Muros perimetrales
		const perimeterMat = new THREE.MeshLambertMaterial({ color: 0xc8bfb0 });
		for (const floor of floors) {
			const fn = nodes.filter((n) => n.floor === floor);
			if (!fn.length) continue;
			const xs = fn.map((n) => n.x / SCALE), zs = fn.map((n) => n.y / SCALE);
			const pad2 = CORRIDOR_R + 0.5;
			const minX = Math.min(...xs) - pad2, maxX = Math.max(...xs) + pad2;
			const minZ = Math.min(...zs) - pad2, maxZ = Math.max(...zs) + pad2;
			const W = maxX - minX, D = maxZ - minZ;
			const midX = (minX + maxX) / 2, midZ = (minZ + maxZ) / 2;
			const fy = floor * FLOOR_H;

			const addWall = (wx: number, wz: number, ww: number, wd: number): void => {
				const m = new THREE.Mesh(new THREE.BoxGeometry(ww, ROOM_H, wd), perimeterMat);
				m.position.set(wx, fy + ROOM_H / 2, wz);
				m.castShadow = true; m.userData = { managed: true };
				scene.add(m);
			};

			addWall(midX, minZ, W + 0.4, 0.2);
			addWall(midX, maxZ, W + 0.4, 0.2);
			addWall(minX, midZ, 0.2, D + 0.4);
			addWall(maxX, midZ, 0.2, D + 0.4);
		}
		// #endregion

		// #region Escaleras cross-floor
		const processedStairs = new Set<string>();
		for (const edge of edges) {
			const fromNode = nodeMap.get(edge.from);
			const toNode   = nodeMap.get(edge.to);
			if (!fromNode || !toNode || fromNode.floor === toNode.floor) continue;

			const pairKey = [edge.from, edge.to].sort().join('|');
			if (processedStairs.has(pairKey)) continue;
			processedStairs.add(pairKey);

			const lowNode  = fromNode.floor < toNode.floor ? fromNode : toNode;
			const highNode = fromNode.floor < toNode.floor ? toNode : fromNode;
			this.buildStairZone(scene, lowNode, highNode, edge.bidirectional ?? true, world);
		}
		// #endregion

		return world;
	}

	// #region Helpers privados

	private addWindowDetails(
		cx: number, cz: number, fy: number, hw: number, hh: number,
		addManaged: (m: THREE.Object3D) => void,
	): void {
		const winMat = new THREE.MeshLambertMaterial({ color: 0x9fd3e8, transparent: true, opacity: 0.55 });
		const frameMat = new THREE.MeshLambertMaterial({ color: 0xf0ebe0 });

		for (const side of [-1, 1] as const) {
			const winW = hw * 0.55, winH = 0.7;
			const winPane = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), winMat);
			winPane.position.set(cx + side * hw * 0.3, fy + ROOM_H * 0.6, cz + hh + 0.01);
			addManaged(winPane);

			const frame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.12, winH + 0.12, 0.06), frameMat);
			frame.position.set(cx + side * hw * 0.3, fy + ROOM_H * 0.6, cz + hh - 0.02);
			addManaged(frame);
		}
	}

	private buildStairZone(
		scene: THREE.Scene, lowNode: CampusNode, highNode: CampusNode,
		bidirectional: boolean, world: WorldData,
	): void {
		const lx = lowNode.x / SCALE,  lz = lowNode.y / SCALE;
		const hx = highNode.x / SCALE, hz = highNode.y / SCALE;

		const dx2d = hx - lx, dz2d = hz - lz;
		const horizDist = Math.sqrt(dx2d * dx2d + dz2d * dz2d);

		let dirX: number, dirZ: number, stairLen: number;

		if (horizDist > 0.8) {
			dirX = dx2d / horizDist; dirZ = dz2d / horizDist;
			stairLen = horizDist;
		} else {
			const dir = this.findAdjacentEdgeDir(lx, lz, lowNode.floor, world.edgeSegs);
			dirX = dir.dx; dirZ = dir.dz;
			stairLen = STAIR_LENGTH;
		}

		const floorDiff  = highNode.floor - lowNode.floor;
		const totalSteps = STAIR_STEPS * floorDiff;
		const stepDepth  = stairLen / totalSteps;
		const totalH     = floorDiff * FLOOR_H;
		const stepH      = totalH / totalSteps;

		const startX = lx, startZ = lz;
		const endX   = lx + dirX * stairLen;
		const endZ   = lz + dirZ * stairLen;
		const startY = lowNode.floor * FLOOR_H;

		const group = buildStairGroup({
			startX, startZ, dirX, dirZ, stairLen,
			totalSteps, stepDepth, stepH, totalH, startY,
		});
		scene.add(group);

		// Markers
		const markerMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
		const markerLow = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), markerMat);
		markerLow.position.set(startX, lowNode.floor * FLOOR_H + 0.03, startZ);
		markerLow.userData = { managed: true };
		scene.add(markerLow);

		const markerHigh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), markerMat);
		markerHigh.position.set(endX, highNode.floor * FLOOR_H + 0.03, endZ);
		markerHigh.userData = { managed: true };
		scene.add(markerHigh);

		// Labels
		const upLabel = this.makeLabel('⬆ Escalera', 0x92400e);
		upLabel.position.set(startX, lowNode.floor * FLOOR_H + ROOM_H - 0.2, startZ);
		upLabel.userData = { managed: true };
		scene.add(upLabel);
		world.labelEntries.push({ sprite: upLabel, pos: new THREE.Vector3(startX, lowNode.floor * FLOOR_H + ROOM_H - 0.2, startZ) });

		const downLabel = this.makeLabel('⬇ Escalera', 0x92400e);
		downLabel.position.set(endX, highNode.floor * FLOOR_H + ROOM_H - 0.2, endZ);
		downLabel.userData = { managed: true };
		scene.add(downLabel);
		world.labelEntries.push({ sprite: downLabel, pos: new THREE.Vector3(endX, highNode.floor * FLOOR_H + ROOM_H - 0.2, endZ) });

		// Synthetic edge on high floor
		const highDist = Math.sqrt((endX - hx) ** 2 + (endZ - hz) ** 2);
		if (highDist > 0.3) {
			world.edgeSegs.push({ ax: hx, az: hz, bx: endX, bz: endZ, floor: highNode.floor });
		}

		world.stairZones.push({
			startX, startZ, endX, endZ, dirX, dirZ,
			len: stairLen, floorLow: lowNode.floor, floorHigh: highNode.floor, bidirectional,
		});
	}

	private findAdjacentEdgeDir(x: number, z: number, floor: number, edgeSegs: EdgeSeg[]): { dx: number; dz: number } {
		for (const seg of edgeSegs) {
			if (seg.floor !== floor) continue;
			const dA = Math.sqrt((seg.ax - x) ** 2 + (seg.az - z) ** 2);
			if (dA < 0.4) {
				const dx = seg.bx - seg.ax, dz = seg.bz - seg.az;
				const len = Math.sqrt(dx * dx + dz * dz);
				if (len > 0.1) return { dx: dx / len, dz: dz / len };
			}
			const dB = Math.sqrt((seg.bx - x) ** 2 + (seg.bz - z) ** 2);
			if (dB < 0.4) {
				const dx = seg.ax - seg.bx, dz = seg.az - seg.bz;
				const len = Math.sqrt(dx * dx + dz * dz);
				if (len > 0.1) return { dx: dx / len, dz: dz / len };
			}
		}
		return { dx: 1, dz: 0 };
	}

	private makeLabel(text: string, color: number): THREE.Sprite {
		return makeLabelSprite(text, color);
	}

	// #endregion
}
