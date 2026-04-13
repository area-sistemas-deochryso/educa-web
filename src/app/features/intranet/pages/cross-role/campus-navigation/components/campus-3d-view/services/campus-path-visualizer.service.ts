import { Injectable } from '@angular/core';
import * as THREE from 'three';
import type { CampusNode, PathResult } from '@features/intranet/pages/cross-role/campus-navigation/models';
import { type SceneLights, SCALE, FLOOR_H, PATH_OFFSET } from '../campus-3d.types';

@Injectable()
export class CampusPathVisualizerService {

	rebuildPath(
		scene: THREE.Scene,
		result: PathResult | null,
		nodeMap: Map<string, CampusNode>,
		currentPathMesh: THREE.Object3D | null,
		lights: SceneLights,
	): THREE.Object3D | null {
		if (currentPathMesh) { scene.remove(currentPathMesh); }

		if (!result || result.path.length < 2) {
			this.setNightMode(false, scene, lights);
			return null;
		}

		this.setNightMode(true, scene, lights);

		const group = new THREE.Group();
		group.userData = { managed: true };

		const stripMat    = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.5 });
		const glowMat     = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.15 });
		const chevMat     = new THREE.MeshBasicMaterial({ color: 0x86efac });
		const STEP_SPACE  = 1.2;

		for (let i = 0; i < result.path.length - 1; i++) {
			const nA = nodeMap.get(result.path[i]);
			const nB = nodeMap.get(result.path[i + 1]);
			if (!nA || !nB || nA.floor !== nB.floor) continue;

			const ax = nA.x / SCALE, az = nA.y / SCALE;
			const bx = nB.x / SCALE, bz = nB.y / SCALE;
			const fy = nA.floor * FLOOR_H + PATH_OFFSET;

			const dx = bx - ax, dz = bz - az;
			const segLen = Math.sqrt(dx * dx + dz * dz);
			if (segLen < 0.1) continue;

			const angle = Math.atan2(dx, dz);
			const cx = (ax + bx) / 2, cz = (az + bz) / 2;

			const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.6, segLen), stripMat);
			strip.rotation.x = -Math.PI / 2;
			strip.rotation.z = -angle;
			strip.position.set(cx, fy, cz);
			group.add(strip);

			const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, segLen), glowMat);
			glow.rotation.x = -Math.PI / 2;
			glow.rotation.z = -angle;
			glow.position.set(cx, fy - 0.01, cz);
			group.add(glow);

			const nLights = Math.max(1, Math.floor(segLen / 4));
			for (let l = 0; l < nLights; l++) {
				const lt = (l + 0.5) / nLights;
				const pathLight = new THREE.PointLight(0x4ade80, 1.2, 5, 1.5);
				pathLight.position.set(ax + dx * lt, fy + 1.5, az + dz * lt);
				group.add(pathLight);
			}

			const nSteps = Math.max(1, Math.floor(segLen / STEP_SPACE));
			for (let s = 0; s < nSteps; s++) {
				const t = (s + 0.5) / nSteps;
				const px = ax + dx * t, pz = az + dz * t;

				const shape = new THREE.Shape();
				shape.moveTo(-0.22, -0.2);
				shape.lineTo(0, 0.2);
				shape.lineTo(0.22, -0.2);
				shape.lineTo(0.13, -0.2);
				shape.lineTo(0, 0.08);
				shape.lineTo(-0.13, -0.2);
				shape.closePath();

				const chev = new THREE.Mesh(new THREE.ShapeGeometry(shape), chevMat);
				chev.rotation.x = -Math.PI / 2;
				chev.rotation.z = -angle;
				chev.position.set(px, fy + 0.03, pz);
				group.add(chev);
			}
		}

		scene.add(group);
		return group;
	}

	private setNightMode(on: boolean, scene: THREE.Scene, lights: SceneLights): void {
		if (on) {
			scene.background = new THREE.Color(0x1a1a2e);
			scene.fog = new THREE.Fog(0x1a1a2e, 20, 60);
			lights.ambient.intensity = 0.15;
			lights.sun.intensity = 0.1;
			lights.player.intensity = 0.8;
			lights.player.distance = 8;
			lights.player.color.set(0xffffff);
		} else {
			scene.background = new THREE.Color(0x87ceeb);
			scene.fog = new THREE.Fog(0xd0e8f8, 35, 110);
			lights.ambient.intensity = 1.5;
			lights.sun.intensity = 2.2;
			lights.player.intensity = 0.4;
			lights.player.distance = 12;
		}
	}
}
