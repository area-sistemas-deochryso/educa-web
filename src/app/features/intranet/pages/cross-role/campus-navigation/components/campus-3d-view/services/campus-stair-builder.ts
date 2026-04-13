import * as THREE from 'three';
import {
	ROOM_H,
	STAIR_STEPS,
	STAIR_WIDTH,
} from '../campus-3d.types';

interface StairGroupParams {
	startX: number;
	startZ: number;
	dirX: number;
	dirZ: number;
	stairLen: number;
	totalSteps: number;
	stepDepth: number;
	stepH: number;
	totalH: number;
	startY: number;
}

/**
 * Builds a THREE group with all stair visuals: steps, rails, enclosure walls, roof.
 * Pure construction — no scene mutation, no side effects.
 */
export function buildStairGroup(params: StairGroupParams): THREE.Group {
	const { startX, startZ, dirX, dirZ, stairLen, totalSteps, stepDepth, stepH, totalH, startY } = params;

	const group = new THREE.Group();
	group.position.set(startX, startY, startZ);
	group.rotation.y = Math.atan2(dirX, dirZ);
	group.userData = { managed: true };

	const stepMat    = new THREE.MeshLambertMaterial({ color: 0x92400e });
	const stepTopMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
	const railMat    = new THREE.MeshLambertMaterial({ color: 0x6b3710 });
	const baseMat    = new THREE.MeshLambertMaterial({ color: 0x4a2208 });
	const sw = STAIR_WIDTH;

	for (let i = 0; i < totalSteps; i++) {
		const blockH = (i + 1) * stepH;
		const step = new THREE.Mesh(new THREE.BoxGeometry(sw, blockH, stepDepth - 0.03), stepMat);
		step.position.set(0, blockH / 2, (i + 0.5) * stepDepth);
		step.castShadow = true;
		group.add(step);

		const topFace = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.08, 0.05, stepDepth - 0.1), stepTopMat);
		topFace.position.set(0, blockH + 0.025, (i + 0.5) * stepDepth);
		group.add(topFace);

		const edgeFace = new THREE.Mesh(
			new THREE.BoxGeometry(sw - 0.04, 0.05, 0.05),
			new THREE.MeshLambertMaterial({ color: 0xfbbf24 }),
		);
		edgeFace.position.set(0, blockH + 0.025, (i + 1) * stepDepth - 0.025);
		group.add(edgeFace);
	}

	const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.3, 0.08, stairLen), baseMat);
	rampMesh.position.set(0, -0.04, stairLen / 2);
	group.add(rampMesh);

	for (const xOff of [-sw / 2 - 0.08, sw / 2 + 0.08]) {
		const postLow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), railMat);
		postLow.position.set(xOff, 0.4, stepDepth * 0.5);
		group.add(postLow);
		const postHigh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), railMat);
		postHigh.position.set(xOff, totalH + 0.4, stairLen - stepDepth * 0.5);
		group.add(postHigh);
		const railLen = Math.sqrt(stairLen * stairLen + totalH * totalH);
		const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, railLen), railMat);
		rail.rotation.x = -Math.atan2(totalH, stairLen);
		rail.position.set(xOff, totalH / 2 + 0.8, stairLen / 2);
		group.add(rail);
	}

	const stairWallMat = new THREE.MeshLambertMaterial({ color: 0xc8bfb0 });
	const enclosureH = totalH + ROOM_H;
	const enclosureLen = stairLen + 0.4;

	for (const xOff of [-sw / 2 - 0.15, sw / 2 + 0.15]) {
		const sideWall = new THREE.Mesh(
			new THREE.BoxGeometry(0.1, enclosureH, enclosureLen),
			stairWallMat,
		);
		sideWall.position.set(xOff, enclosureH / 2, stairLen / 2);
		group.add(sideWall);
	}

	const roofAngle = Math.atan2(totalH, stairLen);
	const roofLen   = Math.sqrt(stairLen * stairLen + totalH * totalH);
	const roofMesh  = new THREE.Mesh(
		new THREE.BoxGeometry(sw + 0.4, 0.12, roofLen + 0.4),
		stairWallMat,
	);
	roofMesh.rotation.x = -roofAngle;
	roofMesh.position.set(0, totalH / 2 + ROOM_H, stairLen / 2);
	group.add(roofMesh);

	const backWall = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.4, ROOM_H, 0.1), stairWallMat);
	backWall.position.set(0, ROOM_H / 2, -0.05);
	group.add(backWall);

	const frontWall = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.4, ROOM_H, 0.1), stairWallMat);
	frontWall.position.set(0, totalH + ROOM_H / 2, stairLen + 0.05);
	group.add(frontWall);

	return group;
}

export { STAIR_STEPS };
