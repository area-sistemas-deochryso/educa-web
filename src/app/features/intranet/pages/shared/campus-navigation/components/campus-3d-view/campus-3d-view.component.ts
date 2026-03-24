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
	template: `
		<div class="overlay3d">
			<canvas #canvas3d class="scene-canvas"
				(mousedown)="onMouseDown($event)"
				(mousemove)="onMouseMove($event)"
				(mouseup)="onMouseUp()"
				(mouseleave)="onMouseUp()"
				(contextmenu)="$event.preventDefault()"
			></canvas>

			<!-- HUD superior -->
			<div class="hud-top">
				<div class="hud-left">
					<div class="dest-badge">
						<span>📍</span>
						<span>{{ destLabel() }}</span>
					</div>
					<div class="floor-badge">Piso {{ currentFloor() }}</div>
				</div>
				<div class="hud-right">
				<button type="button" class="fullscreen-btn" (click)="toggleFullscreen()"
					[title]="isFullscreen() ? 'Salir de pantalla completa' : 'Pantalla completa'">
					<i [class]="isFullscreen() ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"></i>
				</button>
				<button type="button" class="exit-btn" (click)="close.emit()">✕ Salir</button>
			</div>
			</div>

			<!-- Minimap -->
			<canvas #minimap class="minimap" width="170" height="170"></canvas>

			<!-- Panel de controles (desktop) -->
			@if (!isMobile) {
				<div class="controls-panel">
					<div class="cp-title">🎮 Controles</div>
					<div class="cp-row"><kbd>W</kbd><kbd>S</kbd> <span>Avanzar / Retroceder</span></div>
					<div class="cp-row"><kbd>A</kbd><kbd>D</kbd> <span>Girar</span></div>
					<div class="cp-row"><span class="cp-mouse">🖱 Clic + arrastra</span> <span>Mirar libremente</span></div>
					<div class="cp-row"><kbd>ESC</kbd> <span>Salir</span></div>
				<div class="cp-row"><kbd>ESPACIO</kbd> <span>Ajustar posición</span></div>
				</div>
			}

			<!-- Mensaje de escalera -->
			@if (stairMsg()) {
				<div class="stair-msg">{{ stairMsg() }}</div>
			}

			<!-- Modal de llegada -->
			@if (arrivalVisible()) {
				<div class="arrival-overlay">
					<div class="arrival-card">
						<div class="arrival-icon">🎉</div>
						<div class="arrival-title">¡Llegaste!</div>
						<div class="arrival-dest">{{ destLabel() }}</div>
						<div class="arrival-time">⏱ {{ formattedTime() }}</div>
						<div class="arrival-actions">
							<button type="button" class="arrival-retry" (click)="retryNavigation()">🔄 Volver a intentar</button>
							<button type="button" class="arrival-exit" (click)="close.emit()">✕ Salir</button>
						</div>
					</div>
				</div>
			}

			<!-- Joystick (mobile) -->
			@if (isMobile) {
				<div class="joystick-zone"
					(touchstart)="joyStart($event)"
					(touchmove)="joyMove($event)"
					(touchend)="joyEnd()"
					(touchcancel)="joyEnd()"
				>
					<div class="joy-ring">
						<div class="joy-thumb" [style.transform]="joyTransform()"></div>
					</div>
				</div>
				<div class="look-zone"
					(touchstart)="lookTouchStart($event)"
					(touchmove)="lookTouchMove($event)"
					(touchend)="lookTouchEnd()"
				></div>
			}
		</div>
	`,
	styles: `
		:host { display: contents; }

		.overlay3d {
			position: fixed; inset: 0; z-index: 1100;
			background: #87ceeb; display: flex; flex-direction: column;
			user-select: none;
		}
		.scene-canvas {
			flex: 1; width: 100%; height: 100%;
			display: block; cursor: crosshair; touch-action: none;
		}

		// #region HUD
		.hud-top {
			position: absolute; top: 0; left: 0; right: 0;
			display: flex; align-items: center; justify-content: space-between;
			padding: 10px 16px;
			background: linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%);
			pointer-events: none;
		}
		.hud-left { display: flex; align-items: center; gap: 8px; }
		.dest-badge {
			display: flex; align-items: center; gap: 8px;
			background: rgba(255,255,255,0.82); border: 1px solid rgba(0,0,0,0.15);
			border-radius: 20px; padding: 6px 14px; backdrop-filter: blur(6px);
			color: #1e293b; font-size: 14px; font-weight: 600;
		}
		.floor-badge {
			background: rgba(79,70,229,0.85); color: white;
			border-radius: 14px; padding: 4px 12px; font-size: 13px; font-weight: 600;
		}
		.hud-right { display: flex; align-items: center; gap: 8px; pointer-events: auto; }
		.fullscreen-btn, .exit-btn {
			background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.15);
			border-radius: 10px; padding: 6px 14px; cursor: pointer;
			font-size: 13px; font-weight: 600; color: #1e293b;
			backdrop-filter: blur(6px); transition: background 0.15s;
		}
		.fullscreen-btn:hover, .exit-btn:hover { background: rgba(255,255,255,1); }
		.exit-btn { background: rgba(239,68,68,0.9); color: white; border-color: transparent; }
		.exit-btn:hover { background: rgba(220,38,38,1); }
		// #endregion

		// #region Minimap
		.minimap {
			position: absolute; bottom: 16px; right: 16px;
			border-radius: 12px; border: 2px solid rgba(0,0,0,0.15);
			box-shadow: 0 4px 12px rgba(0,0,0,0.2);
		}
		// #endregion

		// #region Controls panel
		.controls-panel {
			position: absolute; bottom: 16px; left: 16px;
			background: rgba(255,255,255,0.88); backdrop-filter: blur(8px);
			border-radius: 12px; padding: 10px 14px; font-size: 12px;
			border: 1px solid rgba(0,0,0,0.1); color: #334155;
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		}
		.cp-title { font-weight: 700; margin-bottom: 6px; font-size: 13px; }
		.cp-row { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
		.cp-row kbd {
			background: #e2e8f0; border-radius: 4px; padding: 1px 6px;
			font-family: monospace; font-size: 11px; border: 1px solid #cbd5e1;
		}
		.cp-mouse { font-style: italic; }
		// #endregion

		// #region Stair message
		.stair-msg {
			position: absolute; bottom: 50%; left: 50%; transform: translateX(-50%);
			background: rgba(146,64,14,0.88); color: #fbbf24;
			border-radius: 16px; padding: 8px 20px; font-size: 14px; font-weight: 600;
			pointer-events: none; white-space: nowrap;
		}
		// #endregion

		// #region Arrival modal
		.arrival-overlay {
			position: absolute; inset: 0; background: rgba(0,0,0,0.6);
			display: flex; align-items: center; justify-content: center; z-index: 10;
		}
		.arrival-card {
			background: white; border-radius: 20px; padding: 32px 40px;
			text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
		}
		.arrival-icon { font-size: 48px; margin-bottom: 8px; }
		.arrival-title { font-size: 28px; font-weight: 800; color: #1e293b; }
		.arrival-dest { font-size: 16px; color: #64748b; margin: 4px 0 12px; }
		.arrival-time { font-size: 20px; font-weight: 600; color: #4f46e5; margin-bottom: 20px; }
		.arrival-actions { display: flex; gap: 12px; justify-content: center; }
		.arrival-retry, .arrival-exit {
			padding: 10px 24px; border-radius: 12px; font-size: 14px;
			font-weight: 600; cursor: pointer; border: none; transition: transform 0.1s;
		}
		.arrival-retry:hover, .arrival-exit:hover { transform: scale(1.03); }
		.arrival-retry { background: #4f46e5; color: white; }
		.arrival-exit { background: #e2e8f0; color: #334155; }
		// #endregion

		// #region Joystick (mobile)
		.joystick-zone {
			position: absolute; bottom: 30px; left: 30px;
			width: 130px; height: 130px; touch-action: none;
		}
		.joy-ring {
			width: 100%; height: 100%; border-radius: 50%;
			background: rgba(255,255,255,0.25); border: 2px solid rgba(255,255,255,0.5);
			display: flex; align-items: center; justify-content: center;
		}
		.joy-thumb {
			width: 48px; height: 48px; border-radius: 50%;
			background: rgba(255,255,255,0.7); transition: transform 0.05s;
		}
		.look-zone {
			position: absolute; top: 0; right: 0; bottom: 0; width: 50%;
			touch-action: none;
		}
		// #endregion
	`,
})
export class Campus3dViewComponent implements AfterViewInit, OnDestroy {

	// #region Inputs / Outputs
	readonly nodes             = input.required<CampusNode[]>();
	readonly edges             = input.required<CampusEdge[]>();
	readonly destinationNodeId = input<string | null>(null);
	readonly pathResult        = input<PathResult | null>(null);
	readonly startNodeId       = input<string | null>(null);

	readonly closestNodeChange = output<string>();
	readonly close             = output<void>();
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
		window.removeEventListener('keyup',   this.onKeyUp);
		document.removeEventListener('fullscreenchange', this.onFullscreenChange);
		this.resizeObserver?.disconnect();
		this.renderer?.dispose();
	}
	// #endregion

	// #region Three.js init
	private initThree(): void {
		const canvas = this.canvasRef.nativeElement;
		const w = canvas.offsetWidth  || 800;
		const h = canvas.offsetHeight || 600;

		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.renderer.setSize(w, h);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x87ceeb);
		this.scene.fog = new THREE.Fog(0xd0e8f8, 35, 110);

		this.camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 200);
		this.camera.rotation.order = 'YXZ';

		const ambient = new THREE.AmbientLight(0xffffff, 1.5);
		const sun = new THREE.DirectionalLight(0xfff8e1, 2.2);
		sun.position.set(30, 60, 20);
		sun.castShadow = true;
		sun.shadow.mapSize.width  = 2048;
		sun.shadow.mapSize.height = 2048;
		sun.shadow.camera.near = 0.5;
		sun.shadow.camera.far  = 200;

		const player = new THREE.PointLight(0xffffff, 0.4, 12, 1.5);
		this.lights = { ambient, sun, player };
		this.scene.add(ambient, sun, player);
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
		if (k === 'escape') this.close.emit();
		if (['w','s','a','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
	};
	private readonly onKeyUp = (e: KeyboardEvent): void => { this.player.keys[e.key.toLowerCase()] = false; };

	private setupKeyboard(): void {
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup',   this.onKeyUp);
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
