import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	ElementRef,
	inject,
	input,
	OnDestroy,
	output,
	signal,
	ViewChild,
} from '@angular/core';
import * as THREE from 'three';

import type { CampusNode, CampusEdge, PathResult } from '../../models';
import {
	type WorldData, type SceneLights,
	PlayerState, LOOK_SENS, TOUCH_LOOK_SENS, MAX_PITCH,
} from './campus-3d.types';
import { CampusCollisionService } from './services/campus-collision.service';
import { CampusSceneBuilderService } from './services/campus-scene-builder.service';
import { CampusPlayerService } from './services/campus-player.service';
import { CampusMinimapService } from './services/campus-minimap.service';
import { CampusPathVisualizerService } from './services/campus-path-visualizer.service';
import { createCampus3dSetup } from './campus-3d-setup.helper';

@Component({
	selector: 'app-campus-3d-view',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		CampusCollisionService,
		CampusSceneBuilderService,
		CampusPlayerService,
		CampusMinimapService,
		CampusPathVisualizerService,
	],
	templateUrl: './campus-3d-view.component.html',
	styleUrl: './campus-3d-view.component.scss',
})
export class Campus3dViewComponent implements AfterViewInit, OnDestroy {

	// #region Inputs / Outputs
	readonly nodes             = input.required<CampusNode[]>();
	readonly edges             = input.required<CampusEdge[]>();
	readonly destinationNodeId = input<string | null>(null);
	readonly pathResult        = input<PathResult | null>(null);
	readonly startNodeId       = input<string | null>(null);

	readonly closestNodeChange = output<string>();
	readonly closeView         = output<void>();
	// #endregion

	// #region ViewChild
	@ViewChild('canvas3d') private canvasRef!: ElementRef<HTMLCanvasElement>;
	@ViewChild('minimap')  private minimapRef!: ElementRef<HTMLCanvasElement>;
	// #endregion

	// #region Servicios
	private readonly sceneBuilder    = inject(CampusSceneBuilderService);
	private readonly playerService   = inject(CampusPlayerService);
	private readonly minimapService  = inject(CampusMinimapService);
	private readonly pathVisualizer  = inject(CampusPathVisualizerService);
	private readonly destroyRef      = inject(DestroyRef);
	// #endregion

	// #region Estado UI
	readonly isMobile     = 'ontouchstart' in window;
	readonly currentFloor = signal(0);
	readonly stairMsg     = signal('');
	readonly isFullscreen = signal(false);
	readonly arrivalVisible = signal(false);
	readonly joyTransform   = signal('translate(0px,0px)');

	private readonly _arrivalTimeMs = signal(0);
	private navStartTime   = 0;
	private lastDestId     = '';
	private closestNodeId  = '';
	private lastRecalcTime = 0;

	readonly formattedTime = computed(() => {
		const ms = this._arrivalTimeMs();
		const s  = Math.floor(ms / 1000);
		const m  = Math.floor(s / 60);
		const sec = s % 60;
		return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
	});

	readonly destLabel = computed(() => {
		const id = this.destinationNodeId();
		if (!id) return 'Exploración libre';
		return this.nodes().find((n) => n.id === id)?.label ?? 'Destino';
	});
	// #endregion

	// #region Three.js engine (owned by component)
	private renderer!: THREE.WebGLRenderer;
	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private lights!: SceneLights;
	private clock    = new THREE.Clock();
	private animId   = 0;
	private pathMesh: THREE.Object3D | null = null;
	private resizeObserver!: ResizeObserver;
	// #endregion

	// #region Estado compartido
	private readonly player = new PlayerState();
	private world: WorldData = { edgeSegs: [], stairZones: [], roomBoxes: [], labelEntries: [], nodeMap: new Map() };
	// #endregion

	// #region Input state
	private joyActive     = false;
	private joyOrigin     = { x: 0, y: 0 };
	private joyDelta      = { x: 0, y: 0 };
	private mouseDown     = false;
	private lastMouse     = { x: 0, y: 0 };
	private lookTouchId: number | null = null;
	private lookTouchLast = { x: 0, y: 0 };
	// #endregion

	constructor() {
		effect(() => {
			const result = this.pathResult();
			if (!this.scene) return;
			this.pathMesh = this.pathVisualizer.rebuildPath(
				this.scene, result, this.world.nodeMap, this.pathMesh, this.lights,
			);
		});

		effect(() => {
			const nodes = this.nodes();
			const edges = this.edges();
			if (nodes.length > 0 && this.scene) {
				this.world = this.sceneBuilder.buildScene(this.scene, nodes, edges);
				this.playerService.placePlayerAtStart(this.player, nodes, this.startNodeId(), this.destinationNodeId());
				this.currentFloor.set(this.player.playerFloor);
				if (this.destinationNodeId()) {
					this.navStartTime = performance.now();
					this.lastDestId = this.destinationNodeId()!;
					this.arrivalVisible.set(false);
				}
			}
		});
	}

	// #region Lifecycle
	ngAfterViewInit(): void {
		this.initThree();
		this.setupKeyboard();
		this.setupResize();
		document.addEventListener('fullscreenchange', this.onFullscreenChange);

		const nodes = this.nodes();
		const edges = this.edges();
		if (nodes.length > 0) {
			this.world = this.sceneBuilder.buildScene(this.scene, nodes, edges);
			this.playerService.placePlayerAtStart(this.player, nodes, this.startNodeId(), this.destinationNodeId());
			this.currentFloor.set(this.player.playerFloor);
			if (this.destinationNodeId()) {
				this.navStartTime = performance.now();
				this.lastDestId = this.destinationNodeId()!;
			}
		}
		this.pathMesh = this.pathVisualizer.rebuildPath(
			this.scene, this.pathResult(), this.world.nodeMap, this.pathMesh, this.lights,
		);
		this.startLoop();
	}

	ngOnDestroy(): void {
		cancelAnimationFrame(this.animId);
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
		document.removeEventListener('fullscreenchange', this.onFullscreenChange);
		this.resizeObserver?.disconnect();
		this.renderer?.dispose();
	}
	// #endregion

	// #region Three.js init
	private initThree(): void {
		const setup = createCampus3dSetup(this.canvasRef.nativeElement);
		this.renderer = setup.renderer;
		this.scene = setup.scene;
		this.camera = setup.camera;
		this.lights = setup.lights;
	}
	// #endregion

	// #region Game loop
	private startLoop(): void {
		this.clock.start();
		const loop = (): void => {
			this.animId = requestAnimationFrame(loop);
			const dt = Math.min(this.clock.getDelta(), 0.05);

			const updateResult = this.playerService.updatePlayer(dt, this.player, this.world, this.joyDelta);
			if (updateResult.floorChanged !== undefined) this.currentFloor.set(updateResult.floorChanged);
			if (updateResult.stairMsg !== undefined) this.stairMsg.set(updateResult.stairMsg);

			// Sync camera
			this.camera.position.set(this.player.px, this.player.cameraY, this.player.pz);
			this.camera.rotation.y = this.player.yaw;
			this.camera.rotation.x = this.player.pitch;
			this.lights.player.position.set(this.player.px, this.player.cameraY + 1.5, this.player.pz);

			this.playerService.updateLabelVisibility(this.camera, this.world.labelEntries);

			// Closest node + arrival detection
			const nodeResult = this.playerService.checkClosestNode(
				this.player, this.nodes(), this.lastRecalcTime,
				this.destinationNodeId(), this.navStartTime, this.arrivalVisible(),
			);
			if (nodeResult) {
				this.lastRecalcTime = performance.now();
				if (nodeResult.nodeId !== this.closestNodeId) {
					this.closestNodeId = nodeResult.nodeId;
					this.closestNodeChange.emit(nodeResult.nodeId);
				}
				if (nodeResult.arrived) {
					this._arrivalTimeMs.set(nodeResult.arrivalTimeMs!);
					this.arrivalVisible.set(true);
				}
			}

			// Minimap
			const minimapCanvas = this.minimapRef?.nativeElement;
			if (minimapCanvas) {
				const ctx = minimapCanvas.getContext('2d')!;
				this.minimapService.draw(ctx, {
					width: minimapCanvas.width, height: minimapCanvas.height,
					nodes: this.nodes(), world: this.world,
					pathResult: this.pathResult(), destinationNodeId: this.destinationNodeId(),
					player: this.player,
				});
			}

			this.renderer.render(this.scene, this.camera);
		};
		loop();
	}
	// #endregion

	// #region Acciones UI
	retryNavigation(): void {
		this.arrivalVisible.set(false);
		this.playerService.placePlayerAtStart(this.player, this.nodes(), this.startNodeId(), this.destinationNodeId());
		this.currentFloor.set(this.player.playerFloor);
		this.navStartTime = performance.now();
	}

	toggleFullscreen(): void {
		if (!document.fullscreenElement) {
			const el = this.canvasRef.nativeElement.closest('.overlay3d') as HTMLElement | null;
			(el ?? document.documentElement).requestFullscreen();
		} else {
			document.exitFullscreen();
		}
	}
	// #endregion

	// #region Input: Teclado
	private readonly onKeyDown = (e: KeyboardEvent): void => {
		const k = e.key.toLowerCase();
		this.player.keys[k] = true;
		if (k === 'escape') this.closeView.emit();
		if (['w','s','a','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
	};
	private readonly onKeyUp = (e: KeyboardEvent): void => { this.player.keys[e.key.toLowerCase()] = false; };
	private setupKeyboard(): void {
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}
	// #endregion

	// #region Input: Ratón
	onMouseDown(e: MouseEvent): void {
		if (e.button === 0 || e.button === 2) { this.mouseDown = true; this.lastMouse = { x: e.clientX, y: e.clientY }; }
	}
	onMouseMove(e: MouseEvent): void {
		if (!this.mouseDown) return;
		this.player.yaw   -= (e.clientX - this.lastMouse.x) * LOOK_SENS;
		this.player.pitch -= (e.clientY - this.lastMouse.y) * LOOK_SENS;
		this.player.pitch  = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.player.pitch));
		this.lastMouse = { x: e.clientX, y: e.clientY };
	}
	onMouseUp(): void { this.mouseDown = false; }
	// #endregion

	// #region Input: Joystick / Touch
	joyStart(e: TouchEvent): void {
		e.preventDefault();
		const t = e.changedTouches[0];
		this.joyActive = true;
		this.joyOrigin = { x: t.clientX, y: t.clientY };
		this.joyDelta  = { x: 0, y: 0 };
	}
	joyMove(e: TouchEvent): void {
		e.preventDefault();
		if (!this.joyActive) return;
		const MAX = 40;
		const t = e.changedTouches[0];
		const dx = Math.max(-MAX, Math.min(MAX, t.clientX - this.joyOrigin.x));
		const dy = Math.max(-MAX, Math.min(MAX, t.clientY - this.joyOrigin.y));
		this.joyDelta = { x: dx / MAX, y: -(dy / MAX) };
		this.joyTransform.set(`translate(${dx}px,${dy}px)`);
	}
	joyEnd(): void { this.joyActive = false; this.joyDelta = { x: 0, y: 0 }; this.joyTransform.set('translate(0px,0px)'); }

	lookTouchStart(e: TouchEvent): void {
		e.preventDefault();
		if (this.lookTouchId !== null) return;
		const t = e.changedTouches[0];
		this.lookTouchId = t.identifier; this.lookTouchLast = { x: t.clientX, y: t.clientY };
	}
	lookTouchMove(e: TouchEvent): void {
		e.preventDefault();
		if (this.lookTouchId === null) return;
		const t = Array.from(e.changedTouches).find((x) => x.identifier === this.lookTouchId);
		if (!t) return;
		this.player.yaw   -= (t.clientX - this.lookTouchLast.x) * TOUCH_LOOK_SENS;
		this.player.pitch -= (t.clientY - this.lookTouchLast.y) * TOUCH_LOOK_SENS;
		this.player.pitch  = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.player.pitch));
		this.lookTouchLast = { x: t.clientX, y: t.clientY };
	}
	lookTouchEnd(): void { this.lookTouchId = null; }
	// #endregion

	// #region Resize + Fullscreen
	private readonly onFullscreenChange = (): void => {
		const isFull = !!document.fullscreenElement;
		this.isFullscreen.set(isFull);
		const doResize = (): void => {
			const w = isFull ? window.innerWidth  : (this.canvasRef?.nativeElement.offsetWidth  || 800);
			const h = isFull ? window.innerHeight : (this.canvasRef?.nativeElement.offsetHeight || 600);
			this.renderer.setSize(w, h);
			this.camera.aspect = w / h;
			this.camera.updateProjectionMatrix();
		};
		doResize();
		setTimeout(doResize, 50);
		setTimeout(doResize, 200);
	};

	private setupResize(): void {
		const canvas = this.canvasRef.nativeElement;
		this.resizeObserver = new ResizeObserver(() => {
			const w = canvas.offsetWidth, h = canvas.offsetHeight;
			if (!w || !h) return;
			this.renderer.setSize(w, h);
			this.camera.aspect = w / h;
			this.camera.updateProjectionMatrix();
		});
		this.resizeObserver.observe(canvas);
	}
	// #endregion
}
