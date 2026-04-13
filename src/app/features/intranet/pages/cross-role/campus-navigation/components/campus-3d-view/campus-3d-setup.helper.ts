import * as THREE from 'three';
import type { SceneLights } from './campus-3d.types';

export interface ThreeSetup {
	renderer: THREE.WebGLRenderer;
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	lights: SceneLights;
}

/** Initializes a Three.js renderer/scene/camera with default lighting for the campus view. */
export function createCampus3dSetup(canvas: HTMLCanvasElement): ThreeSetup {
	const w = canvas.offsetWidth || 800;
	const h = canvas.offsetHeight || 600;

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setSize(w, h);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x87ceeb);
	scene.fog = new THREE.Fog(0xd0e8f8, 35, 110);

	const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 200);
	camera.rotation.order = 'YXZ';

	const ambient = new THREE.AmbientLight(0xffffff, 1.5);
	const sun = new THREE.DirectionalLight(0xfff8e1, 2.2);
	sun.position.set(30, 60, 20);
	sun.castShadow = true;
	sun.shadow.mapSize.width = 2048;
	sun.shadow.mapSize.height = 2048;
	sun.shadow.camera.near = 0.5;
	sun.shadow.camera.far = 200;

	const player = new THREE.PointLight(0xffffff, 0.4, 12, 1.5);
	const lights: SceneLights = { ambient, sun, player };
	scene.add(ambient, sun, player);

	return { renderer, scene, camera, lights };
}
