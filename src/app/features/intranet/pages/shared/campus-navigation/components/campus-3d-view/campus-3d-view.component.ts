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

import { CampusEdge, CampusNode, PathResult } from '../../models';

// #region Constantes
const SCALE             = 30;
const ROOM_H            = 3.2;
const FLOOR_H           = 6.5;
const EYE_H             = 1.55;
const MOVE_SPEED        = 2.5;
const TURN_SPEED        = 1.6;
const LOOK_SENS         = 0.0022;
const TOUCH_LOOK_SENS   = 0.004;
const MAX_PITCH         = 0.9;
const CORRIDOR_R        = 1.0;
const PLAYER_R          = 0.35;
const STAIR_STEPS       = 14;     // escalones por piso
const STAIR_LENGTH      = 5.0;    // longitud horizontal de la escalera
const STAIR_WIDTH       = 2.2;    // ancho caminable
const PATH_OFFSET       = 0.22;
const NODE_RECALC_MS    = 250;
const FLOOR_LERP_SPEED  = 8;
const LABEL_VIEW_DOT    = 0.62;   // coseno del ángulo máximo para mostrar label (~51°)
const LABEL_VIEW_DIST   = 22;     // distancia máxima en unidades 3D

// Colores colegio de día (paredes)
const ROOM_COLORS: Record<string, number> = {
	classroom: 0xe8c98a,   // crema cálido — pared aula
	stairs:    0x8B6914,   // marrón madera
	entrance:  0x2e7d32,   // verde institucional
	patio:     0x4caf50,   // verde patio
	bathroom:  0x0288d1,   // azul cerámico
	office:    0xf9a825,   // ámbar dirección
};
// Colores del suelo interior de cada tipo de nodo
const FLOOR_COLORS: Record<string, number> = {
	classroom: 0xc4a96a,
	stairs:    0x5d4037,
	entrance:  0x388e3c,
	patio:     0x558b2f,
	bathroom:  0x0277bd,
	office:    0xf57f17,
};
// #endregion

// #region Tipos locales
interface EdgeSeg  { ax: number; az: number; bx: number; bz: number; floor: number; }
interface RoomBox  { minX: number; maxX: number; minZ: number; maxZ: number; floor: number; }
interface LabelEntry { sprite: THREE.Sprite; pos: THREE.Vector3; }

/**
 * Zona de escalera entre dos pisos.
 * startX/startZ = punto de entrada del piso bajo (t=0).
 * t=1 = punto final en el piso alto.
 * Se permite bajar si bidirectional=true.
 */
interface StairZone {
	startX: number; startZ: number;  // entrada piso bajo (t=0)
	endX: number;   endZ: number;    // salida piso alto (t=1)
	dirX: number;   dirZ: number;    // dirección ascendente normalizada
	len: number;
	floorLow: number; floorHigh: number;
	bidirectional: boolean;
}

interface Vec2 { x: number; z: number; }
// #endregion

@Component({
	selector: 'app-campus-3d-view',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
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
			background: rgba(79,70,229,0.85); color: #fff;
			border-radius: 12px; padding: 4px 12px;
			font-size: 12px; font-weight: 700;
		}
		.hud-right { display: flex; align-items: center; gap: 8px; pointer-events: all; }
		.fullscreen-btn {
			background: rgba(255,255,255,0.8); color: #1e293b;
			border: 1px solid rgba(0,0,0,0.2); border-radius: 8px;
			padding: 6px 10px; font-size: 15px; cursor: pointer;
			backdrop-filter: blur(4px); transition: background 0.15s; line-height: 1;
			&:hover { background: rgba(79,70,229,0.85); color: #fff; }
		}
		.exit-btn {
			pointer-events: all;
			background: rgba(255,255,255,0.8); color: #1e293b;
			border: 1px solid rgba(0,0,0,0.2); border-radius: 8px;
			padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
			backdrop-filter: blur(4px); transition: background 0.15s;
			&:hover { background: rgba(220,38,38,0.85); color: #fff; }
		}
		// #endregion

		.minimap {
			position: absolute; bottom: 16px; right: 16px;
			border-radius: 10px; border: 2px solid rgba(0,0,0,0.25);
			background: rgba(255,255,255,0.85); backdrop-filter: blur(6px);
			box-shadow: 0 4px 20px rgba(0,0,0,0.3);
		}

		// #region Controles panel
		.controls-panel {
			position: absolute; bottom: 16px; left: 16px;
			background: rgba(255,255,255,0.82); border: 1px solid rgba(0,0,0,0.15);
			border-radius: 10px; padding: 10px 14px;
			backdrop-filter: blur(8px); display: flex; flex-direction: column;
			gap: 5px; min-width: 210px;
		}
		.cp-title { color: #1e293b; font-size: 12px; font-weight: 700; margin-bottom: 2px; }
		.cp-row {
			display: flex; align-items: center; gap: 6px;
			color: #475569; font-size: 11px;
			span { flex: 1; }
		}
		kbd {
			display: inline-flex; align-items: center; justify-content: center;
			background: #f1f5f9; border: 1px solid #cbd5e1;
			border-radius: 4px; padding: 1px 5px; font-size: 10px;
			font-family: monospace; color: #1e293b; min-width: 20px;
		}
		.cp-mouse { font-size: 11px; }
		// #endregion

		.stair-msg {
			position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
			background: rgba(180,83,9,0.92); color: #fff;
			border-radius: 10px; padding: 8px 22px; font-size: 14px; font-weight: 700;
			pointer-events: none; backdrop-filter: blur(4px);
			border: 1px solid rgba(251,191,36,0.5);
			white-space: nowrap;
		}

		// #region Modal de llegada
		.arrival-overlay {
			position: absolute; inset: 0;
			background: rgba(0,0,0,0.6);
			display: flex; align-items: center; justify-content: center;
			z-index: 100; backdrop-filter: blur(4px);
		}
		.arrival-card {
			background: rgba(255,255,255,0.95); border-radius: 16px;
			padding: 32px 40px; text-align: center;
			box-shadow: 0 8px 32px rgba(0,0,0,0.3);
			min-width: 280px;
		}
		.arrival-icon { font-size: 48px; margin-bottom: 8px; }
		.arrival-title { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
		.arrival-dest { font-size: 16px; color: #475569; margin-bottom: 16px; }
		.arrival-time {
			font-size: 20px; font-weight: 700; color: #4f46e5;
			margin-bottom: 24px;
		}
		.arrival-actions { display: flex; gap: 12px; justify-content: center; }
		.arrival-retry {
			background: #4f46e5; color: #fff; border: none; border-radius: 10px;
			padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
			transition: background 0.15s;
			&:hover { background: #4338ca; }
		}
		.arrival-exit {
			background: transparent; color: #64748b; border: 1px solid #cbd5e1;
			border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600;
			cursor: pointer; transition: all 0.15s;
			&:hover { background: #f1f5f9; }
		}
		// #endregion

		// #region Joystick mobile
		.joystick-zone {
			position: absolute; bottom: 0; left: 0;
			width: 44%; height: 44%;
			display: flex; align-items: center; justify-content: center;
			touch-action: none;
		}
		.joy-ring {
			width: 100px; height: 100px; border-radius: 50%;
			background: rgba(0,0,0,0.12); border: 2px solid rgba(0,0,0,0.25);
			display: flex; align-items: center; justify-content: center; position: relative;
		}
		.joy-thumb {
			width: 40px; height: 40px; border-radius: 50%;
			background: rgba(79,70,229,0.7); border: 2px solid rgba(79,70,229,0.9);
			position: absolute;
		}
		.look-zone { position: absolute; bottom: 0; right: 0; width: 56%; height: 55%; touch-action: none; }
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
	// #region Estado UI

	readonly isMobile     = 'ontouchstart' in window;
	readonly currentFloor = signal(0);
	readonly stairMsg      = signal('');
	readonly isFullscreen  = signal(false);
	readonly arrivalVisible  = signal(false);
	private readonly _arrivalTimeMs = signal(0);
	private navStartTime   = 0;
	private lastDestId     = '';

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

	readonly joyTransform = signal('translate(0px,0px)');

	// #endregion
	// #region Three.js

	private renderer!: THREE.WebGLRenderer;
	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private playerLight!: THREE.PointLight;
	private ambientLight!: THREE.AmbientLight;
	private sunLight!: THREE.DirectionalLight;
	private clock    = new THREE.Clock();
	private animId   = 0;
	private pathMesh: THREE.Object3D | null = null;
	private resizeObserver!: ResizeObserver;

	// #endregion
	// #region Player state

	private px = 0; private pz = 0;
	private yaw = 0; private pitch = 0;
	private playerFloor  = 0;
	private cameraY      = EYE_H;
	private inStairZoneNow = false;       // hysteresis para evitar entrada accidental
	private stairExitCooldown = 0;        // timestamp ms — bloquea re-entrada al salir
	private spaceWasDown     = false;     // edge-detection para tecla Espacio
	private readonly keys: Record<string, boolean> = {};

	// #endregion
	// #region Datos de navegación precalculados

	private edgeSegs:    EdgeSeg[]    = [];
	private stairZones:  StairZone[]  = [];
	private roomBoxes:   RoomBox[]    = [];
	private labelEntries: LabelEntry[] = [];
	private nodeMap      = new Map<string, CampusNode>();

	// Vectores reutilizables para label visibility (evitar GC)
	private readonly _camDir    = new THREE.Vector3();
	private readonly _toSprite  = new THREE.Vector3();

	// #endregion
	// #region Joystick / mouse state

	private joyActive     = false;
	private joyOrigin     = { x: 0, y: 0 };
	private joyDelta      = { x: 0, y: 0 };
	private mouseDown     = false;
	private lastMouse     = { x: 0, y: 0 };
	private lookTouchId: number | null = null;
	private lookTouchLast = { x: 0, y: 0 };

	// #endregion
	// #region Closest node tracking

	private closestNodeId  = '';
	private lastRecalcTime = 0;

	// #endregion

	private readonly destroyRef = inject(DestroyRef);

	constructor() {
		effect(() => {
			const result = this.pathResult();
			if (!this.scene) return;
			this.rebuildPath(result);
		});

		effect(() => {
			const nodes = this.nodes();
			const edges = this.edges();
			if (nodes.length > 0 && this.scene) {
				this.buildScene(nodes, edges);
				this.placePlayerAtStart(nodes);
			}
		});
	}

	ngAfterViewInit(): void {
		this.initThree();
		this.setupKeyboard();
		this.setupResize();
		document.addEventListener('fullscreenchange', this.onFullscreenChange);
		const nodes = this.nodes();
		const edges = this.edges();
		if (nodes.length > 0) {
			this.buildScene(nodes, edges);
			this.placePlayerAtStart(nodes);
		}
		this.rebuildPath(this.pathResult());
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
		this.scene.background = new THREE.Color(0x87ceeb);           // cielo azul día
		this.scene.fog = new THREE.Fog(0xd0e8f8, 35, 110);           // neblina diurna

		this.camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 200);
		this.camera.rotation.order = 'YXZ';

		this.ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
		this.sunLight = new THREE.DirectionalLight(0xfff8e1, 2.2);
		this.sunLight.position.set(30, 60, 20);
		this.sunLight.castShadow = true;
		this.sunLight.shadow.mapSize.width  = 2048;
		this.sunLight.shadow.mapSize.height = 2048;
		this.sunLight.shadow.camera.near = 0.5;
		this.sunLight.shadow.camera.far  = 200;

		this.playerLight = new THREE.PointLight(0xffffff, 0.4, 12, 1.5);
		this.scene.add(this.ambientLight, this.sunLight, this.playerLight);
	}

	// #endregion
	// #region Construcción de escena

	private buildScene(nodes: CampusNode[], edges: CampusEdge[]): void {
		const toRemove = this.scene.children.filter((c) => c.userData['managed']);
		toRemove.forEach((c) => this.scene.remove(c));

		this.nodeMap     = new Map(nodes.map((n) => [n.id, n]));
		this.edgeSegs    = [];
		this.stairZones  = [];
		this.roomBoxes   = [];
		this.labelEntries = [];

		const floors = [...new Set(nodes.map((n) => n.floor))].sort((a, b) => a - b);

		// #region Suelo + techo por piso (colores de colegio)
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

			const addManaged = (mesh: THREE.Object3D): void => {
				mesh.userData = { managed: true };
				this.scene.add(mesh);
			};

			// Suelo: baldosa beige de colegio
			const floorMesh = new THREE.Mesh(
				new THREE.PlaneGeometry(fw, fd),
				new THREE.MeshLambertMaterial({ color: floor % 2 === 0 ? 0xd4c4a8 : 0xc8b89a }),
			);
			floorMesh.rotation.x = -Math.PI / 2;
			floorMesh.position.set(cx, fy - 0.01, cz);
			floorMesh.receiveShadow = true;
			addManaged(floorMesh);

			// Techo: blanco tiza
			const ceilMesh = new THREE.Mesh(
				new THREE.PlaneGeometry(fw, fd),
				new THREE.MeshLambertMaterial({ color: 0xf5f0e8, side: THREE.BackSide }),
			);
			ceilMesh.rotation.x = Math.PI / 2;
			ceilMesh.position.set(cx, fy + ROOM_H + 0.1, cz);
			addManaged(ceilMesh);

			// Luz ambiental del piso (cálida como luz solar entrando)
			const fl = new THREE.PointLight(0xfff8e1, 0.6, Math.max(fw, fd) * 1.1);
			fl.position.set(cx, fy + ROOM_H - 0.3, cz);
			fl.userData = { managed: true };
			this.scene.add(fl);
		}
		// #endregion

		// #region Primera pasada: edgeSegs mismo piso
		for (const edge of edges) {
			const fromNode = this.nodeMap.get(edge.from);
			const toNode   = this.nodeMap.get(edge.to);
			if (!fromNode || !toNode) continue;
			if (fromNode.floor !== toNode.floor) continue;
			this.edgeSegs.push({
				ax: fromNode.x / SCALE, az: fromNode.y / SCALE,
				bx: toNode.x   / SCALE, bz: toNode.y   / SCALE,
				floor: fromNode.floor,
			});
		}
		// #endregion

		// #region Habitaciones: paredes + suelo + AABB + label
		for (const node of nodes) {
			if (node.type === 'corridor') continue;
			const fy = node.floor * FLOOR_H;
			const cx = node.x / SCALE, cz = node.y / SCALE;
			const hw = (node.width  ?? 80) / SCALE / 2;
			const hh = (node.height ?? 50) / SCALE / 2;
			const color      = ROOM_COLORS[node.type]  ?? 0xd4c4a8;
			const floorColor = FLOOR_COLORS[node.type] ?? 0xc4a96a;

			const addManaged = (m: THREE.Object3D): void => { m.userData = { managed: true }; this.scene.add(m); };

			// Paredes con apariencia de colegio
			const wall = new THREE.Mesh(
				new THREE.BoxGeometry(hw * 2, ROOM_H, hh * 2),
				new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.88 }),
			);
			wall.position.set(cx, fy + ROOM_H / 2, cz);
			wall.castShadow = true;
			wall.receiveShadow = true;
			addManaged(wall);

			// Marco de ventana (solo para salones)
			if (node.type === 'classroom') {
				this.addWindowDetails(cx, cz, fy, hw, hh, addManaged);
			}

			// Suelo interior
			const rf = new THREE.Mesh(
				new THREE.PlaneGeometry(hw * 2 - 0.1, hh * 2 - 0.1),
				new THREE.MeshLambertMaterial({ color: floorColor }),
			);
			rf.rotation.x = -Math.PI / 2;
			rf.position.set(cx, fy + 0.01, cz);
			addManaged(rf);

			// Etiqueta (inicialmente invisible, se muestra según ángulo de cámara)
			const spritePos = new THREE.Vector3(cx, fy + ROOM_H + 0.8, cz);
			const sprite = this.makeLabel(node.label, color);
			sprite.position.copy(spritePos);
			(sprite.material as THREE.SpriteMaterial).opacity = 0;
			addManaged(sprite);
			this.labelEntries.push({ sprite, pos: spritePos });

			// AABB de colisión
			this.roomBoxes.push({
				minX: cx - hw + PLAYER_R, maxX: cx + hw - PLAYER_R,
				minZ: cz - hh + PLAYER_R, maxZ: cz + hh - PLAYER_R,
				floor: node.floor,
			});
		}
		// #endregion

		// #region Corredores: suelo + muros guía
		const corridorFloorMat = new THREE.MeshLambertMaterial({ color: 0xbcb0a0 });
		const guideWallMat = new THREE.MeshLambertMaterial({ color: 0xd8cfc4 });

		// Suelo en todos los segmentos
		for (const seg of this.edgeSegs) {
			const ax = seg.ax, az = seg.az, bx = seg.bx, bz = seg.bz;
			const dx = bx - ax, dz = bz - az;
			const len = Math.sqrt(dx * dx + dz * dz);
			if (len < 0.05) continue;

			const cx = (ax + bx) / 2, cz = (az + bz) / 2;
			const fy = seg.floor * FLOOR_H;

			const group = new THREE.Group();
			group.position.set(cx, fy, cz);
			group.rotation.y = Math.atan2(dx, dz);
			group.userData   = { managed: true };

			const floorStrip = new THREE.Mesh(
				new THREE.PlaneGeometry(CORRIDOR_R * 2.0, len),
				corridorFloorMat,
			);
			floorStrip.rotation.x = -Math.PI / 2;
			floorStrip.position.y = 0.015;
			group.add(floorStrip);

			this.scene.add(group);
		}

		// Muros guía por sampleo del borde caminable.
		// Recorre una grilla; en cada punto NO caminable adyacente a un punto SÍ caminable,
		// coloca un pilar de muro. Esto genera un contorno exacto del área caminable.
		const GRID_STEP = 0.5;  // resolución de la grilla (menor = más preciso, más geometría)
		const PILLAR_SIZE = GRID_STEP;  // cada pilar cubre una celda

		for (const floor of floors) {
			const fn = nodes.filter((n) => n.floor === floor);
			if (!fn.length) continue;
			const xs = fn.map((n) => n.x / SCALE), zs = fn.map((n) => n.y / SCALE);
			const pad = CORRIDOR_R + 2;
			const gMinX = Math.min(...xs) - pad, gMaxX = Math.max(...xs) + pad;
			const gMinZ = Math.min(...zs) - pad, gMaxZ = Math.max(...zs) + pad;
			const fy = floor * FLOOR_H;

			// Cachear walkability en la grilla para no recalcular
			const savedFloor = this.playerFloor;
			this.playerFloor = floor;

			const cols = Math.ceil((gMaxX - gMinX) / GRID_STEP);
			const rows = Math.ceil((gMaxZ - gMinZ) / GRID_STEP);
			const grid: boolean[] = new Array(cols * rows);

			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const px = gMinX + c * GRID_STEP + GRID_STEP / 2;
					const pz = gMinZ + r * GRID_STEP + GRID_STEP / 2;
					grid[r * cols + c] = this.isWalkableForWalls(px, pz, floor);
				}
			}

			this.playerFloor = savedFloor;

			// Colocar pilares en celdas NO caminables que tengan al menos un vecino caminable
			const pillarGeo = new THREE.BoxGeometry(PILLAR_SIZE, ROOM_H, PILLAR_SIZE);
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					if (grid[r * cols + c]) continue; // es caminable, no poner muro

					// Verificar si algún vecino (4-dir) es caminable
					let adjacentWalkable = false;
					if (c > 0 && grid[r * cols + (c - 1)]) adjacentWalkable = true;
					if (c < cols - 1 && grid[r * cols + (c + 1)]) adjacentWalkable = true;
					if (r > 0 && grid[(r - 1) * cols + c]) adjacentWalkable = true;
					if (r < rows - 1 && grid[(r + 1) * cols + c]) adjacentWalkable = true;

					if (!adjacentWalkable) continue;

					const wx = gMinX + c * GRID_STEP + GRID_STEP / 2;
					const wz = gMinZ + r * GRID_STEP + GRID_STEP / 2;
					const pillar = new THREE.Mesh(pillarGeo, guideWallMat);
					pillar.position.set(wx, fy + ROOM_H / 2, wz);
					pillar.userData = { managed: true };
					this.scene.add(pillar);
				}
			}
		}
		// #endregion

		// #region Muros perimetrales por piso
		// 4 paredes continuas (N/S/E/O) que forman el exterior del edificio.
		// Al no tener uniones internas, eliminan todos los huecos de las intersecciones.
		const perimeterMat = new THREE.MeshLambertMaterial({ color: 0xc8bfb0 });

		for (const floor of floors) {
			const fn = nodes.filter((n) => n.floor === floor);
			if (!fn.length) continue;
			const xs  = fn.map((n) => n.x / SCALE);
			const zs  = fn.map((n) => n.y / SCALE);
			const pad = CORRIDOR_R + 0.5;
			const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
			const minZ = Math.min(...zs) - pad, maxZ = Math.max(...zs) + pad;
			const W = maxX - minX, D = maxZ - minZ;
			const midX = (minX + maxX) / 2, midZ = (minZ + maxZ) / 2;
			const fy  = floor * FLOOR_H;

			const addWall = (wx: number, wz: number, ww: number, wd: number): void => {
				const m = new THREE.Mesh(new THREE.BoxGeometry(ww, ROOM_H, wd), perimeterMat);
				m.position.set(wx, fy + ROOM_H / 2, wz);
				m.castShadow = true;
				m.userData = { managed: true };
				this.scene.add(m);
			};

			addWall(midX, minZ, W + 0.4, 0.2);   // Muro norte
			addWall(midX, maxZ, W + 0.4, 0.2);   // Muro sur
			addWall(minX, midZ, 0.2, D + 0.4);   // Muro oeste
			addWall(maxX, midZ, 0.2, D + 0.4);   // Muro este
		}
		// #endregion

		// #region Escaleras cross-floor
		const processedStairs = new Set<string>();
		for (const edge of edges) {
			const fromNode = this.nodeMap.get(edge.from);
			const toNode   = this.nodeMap.get(edge.to);
			if (!fromNode || !toNode || fromNode.floor === toNode.floor) continue;

			const pairKey = [edge.from, edge.to].sort().join('|');
			if (processedStairs.has(pairKey)) continue;
			processedStairs.add(pairKey);

			const lowNode  = fromNode.floor < toNode.floor ? fromNode : toNode;
			const highNode = fromNode.floor < toNode.floor ? toNode : fromNode;
			this.buildStairZone(lowNode, highNode, edge.bidirectional ?? true);
		}
		// #endregion
	}

	/**
	 * Añade detalles de ventana a los salones para aspecto de colegio.
	 * Barras horizontales de color crema sobre la pared.
	 */
	private addWindowDetails(
		cx: number, cz: number, fy: number, hw: number, hh: number,
		addManaged: (m: THREE.Object3D) => void,
	): void {
		const winMat = new THREE.MeshLambertMaterial({ color: 0x9fd3e8, transparent: true, opacity: 0.55 });
		const frameMat = new THREE.MeshLambertMaterial({ color: 0xf0ebe0 });

		// Ventana en la cara frontal (positivo z)
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

	/**
	 * Construye la geometría 3D de una escalera real (peldaños tipo stairs, no rampa).
	 * La escalera va desde lowNode (t=0, piso bajo) hasta el extremo alto (t=1, piso alto).
	 *
	 * Corrección clave: startX/startZ = posición exacta del nodo bajo (t=0).
	 * Permite subir con W (tDelta+) y bajar con S (tDelta-) desde ambos lados.
	 */
	private buildStairZone(lowNode: CampusNode, highNode: CampusNode, bidirectional: boolean): void {
		const lx = lowNode.x / SCALE,  lz = lowNode.y / SCALE;
		const hx = highNode.x / SCALE, hz = highNode.y / SCALE;

		const dx2d = hx - lx, dz2d = hz - lz;
		const horizDist = Math.sqrt(dx2d * dx2d + dz2d * dz2d);

		let dirX: number, dirZ: number, stairLen: number;

		if (horizDist > 0.8) {
			// Nodos en posiciones distintas → usar su dirección
			dirX = dx2d / horizDist;
			dirZ = dz2d / horizDist;
			stairLen = horizDist;
		} else {
			// Misma posición 2D → orientar hacia el corredor adyacente en el piso bajo
			const dir = this.findAdjacentEdgeDir(lx, lz, lowNode.floor);
			dirX = dir.dx; dirZ = dir.dz;
			stairLen = STAIR_LENGTH;
		}

		const floorDiff  = highNode.floor - lowNode.floor;
		const totalSteps = STAIR_STEPS * floorDiff;
		const stepDepth  = stairLen / totalSteps;
		const totalH     = floorDiff * FLOOR_H;
		const stepH      = totalH / totalSteps;

		// CLAVE: la escalera arranca en lx, lz (piso bajo, t=0)
		const startX = lx, startZ = lz;
		const endX   = lx + dirX * stairLen;
		const endZ   = lz + dirZ * stairLen;
		const startY = lowNode.floor * FLOOR_H;

		// Grupo orientado en la dirección de ascenso
		const group = new THREE.Group();
		group.position.set(startX, startY, startZ);
		group.rotation.y = Math.atan2(dirX, dirZ);
		group.userData   = { managed: true };

		const stepMat    = new THREE.MeshLambertMaterial({ color: 0x92400e });  // madera oscura
		const stepTopMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });  // ámbar claro superficie
		const railMat    = new THREE.MeshLambertMaterial({ color: 0x6b3710 });  // barandal marrón
		const baseMat    = new THREE.MeshLambertMaterial({ color: 0x4a2208 });  // base

		const sw = STAIR_WIDTH;

		// Escalones: cada uno es un bloque acumulativo (simula los peldaños reales)
		for (let i = 0; i < totalSteps; i++) {
			const blockH = (i + 1) * stepH;    // altura acumulada del bloque

			// Bloque principal del peldaño
			const geo  = new THREE.BoxGeometry(sw, blockH, stepDepth - 0.03);
			const step = new THREE.Mesh(geo, stepMat);
			step.position.set(0, blockH / 2, (i + 0.5) * stepDepth);
			step.castShadow = true;
			group.add(step);

			// Cara superior (huella) más clara para contraste
			const topGeo  = new THREE.BoxGeometry(sw - 0.08, 0.05, stepDepth - 0.1);
			const topFace = new THREE.Mesh(topGeo, stepTopMat);
			topFace.position.set(0, blockH + 0.025, (i + 0.5) * stepDepth);
			group.add(topFace);

			// Línea de borde del escalón (contraste visual)
			const edgeGeo  = new THREE.BoxGeometry(sw - 0.04, 0.05, 0.05);
			const edgeFace = new THREE.Mesh(edgeGeo, new THREE.MeshLambertMaterial({ color: 0xfbbf24 }));
			edgeFace.position.set(0, blockH + 0.025, (i + 1) * stepDepth - 0.025);
			group.add(edgeFace);
		}

		// Base/rampa bajo los escalones
		const rampGeo  = new THREE.BoxGeometry(sw + 0.3, 0.08, stairLen);
		const rampMesh = new THREE.Mesh(rampGeo, baseMat);
		rampMesh.position.set(0, -0.04, stairLen / 2);
		group.add(rampMesh);

		// Barandales laterales (inclinados con la escalera)
		const railH = totalH + 0.8;
		for (const xOff of [-sw / 2 - 0.08, sw / 2 + 0.08]) {
			// Poste inferior
			const postLow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), railMat);
			postLow.position.set(xOff, 0.4, stepDepth * 0.5);
			group.add(postLow);
			// Poste superior
			const postHigh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), railMat);
			postHigh.position.set(xOff, totalH + 0.4, stairLen - stepDepth * 0.5);
			group.add(postHigh);
			// Barandal inclinado
			const railLen = Math.sqrt(stairLen * stairLen + totalH * totalH);
			const railGeo = new THREE.BoxGeometry(0.07, 0.07, railLen);
			const rail = new THREE.Mesh(railGeo, railMat);
			const railAngle = Math.atan2(totalH, stairLen);
			rail.rotation.x = -railAngle;
			rail.position.set(
				xOff,
				totalH / 2 + 0.8,
				stairLen / 2,
			);
			group.add(rail);
		}

		// Paredes laterales del hueco de escalera (cierran la vista al exterior)
		const stairWallMat = new THREE.MeshLambertMaterial({ color: 0xc8bfb0 });
		const enclosureH = totalH + ROOM_H;  // altura total del recubrimiento
		const enclosureLen = stairLen + 0.4;  // un poco más largo que la escalera

		for (const xOff of [-sw / 2 - 0.15, sw / 2 + 0.15]) {
			const sideWall = new THREE.Mesh(
				new THREE.BoxGeometry(0.1, enclosureH, enclosureLen),
				stairWallMat,
			);
			sideWall.position.set(xOff, enclosureH / 2, stairLen / 2);
			group.add(sideWall);
		}

		// Techo inclinado que sigue la pendiente de la escalera
		const roofAngle = Math.atan2(totalH, stairLen);
		const roofLen   = Math.sqrt(stairLen * stairLen + totalH * totalH);
		const roofMesh  = new THREE.Mesh(
			new THREE.BoxGeometry(sw + 0.4, 0.12, roofLen + 0.4),
			stairWallMat,
		);
		roofMesh.rotation.x = -roofAngle;
		roofMesh.position.set(0, totalH / 2 + ROOM_H, stairLen / 2);
		group.add(roofMesh);

		// Pared trasera (cierra el fondo de la escalera en la parte baja)
		const backWall = new THREE.Mesh(
			new THREE.BoxGeometry(sw + 0.4, ROOM_H, 0.1),
			stairWallMat,
		);
		backWall.position.set(0, ROOM_H / 2, -0.05);
		group.add(backWall);

		// Pared frontal (cierra el frente de la escalera en la parte alta)
		const frontWall = new THREE.Mesh(
			new THREE.BoxGeometry(sw + 0.4, ROOM_H, 0.1),
			stairWallMat,
		);
		frontWall.position.set(0, totalH + ROOM_H / 2, stairLen + 0.05);
		group.add(frontWall);

		this.scene.add(group);

		// Marcadores en suelo (indicadores ámbar de inicio/fin de escalera)
		const markerMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
		const markerLow = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), markerMat);
		markerLow.position.set(startX, lowNode.floor * FLOOR_H + 0.03, startZ);
		markerLow.userData = { managed: true };
		this.scene.add(markerLow);

		const markerHigh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), markerMat);
		markerHigh.position.set(endX, highNode.floor * FLOOR_H + 0.03, endZ);
		markerHigh.userData = { managed: true };
		this.scene.add(markerHigh);

		// Letrero indicativo en el extremo del piso alto para encontrar la bajada
		const upLabel = this.makeLabel('⬆ Escalera', 0x92400e);
		upLabel.position.set(startX, lowNode.floor * FLOOR_H + ROOM_H - 0.2, startZ);
		upLabel.userData = { managed: true };
		this.scene.add(upLabel);
		this.labelEntries.push({ sprite: upLabel, pos: new THREE.Vector3(startX, lowNode.floor * FLOOR_H + ROOM_H - 0.2, startZ) });

		const downLabel = this.makeLabel('⬇ Escalera', 0x92400e);
		downLabel.position.set(endX, highNode.floor * FLOOR_H + ROOM_H - 0.2, endZ);
		downLabel.userData = { managed: true };
		this.scene.add(downLabel);
		this.labelEntries.push({ sprite: downLabel, pos: new THREE.Vector3(endX, highNode.floor * FLOOR_H + ROOM_H - 0.2, endZ) });

		// Segmento sintético en el piso alto para que sea walkable hacia el extremo alto
		const highDist = Math.sqrt((endX - hx) ** 2 + (endZ - hz) ** 2);
		if (highDist > 0.3) {
			this.edgeSegs.push({ ax: hx, az: hz, bx: endX, bz: endZ, floor: highNode.floor });
		}

		// Registrar zona walkable de escalera
		this.stairZones.push({
			startX, startZ,
			endX, endZ,
			dirX, dirZ,
			len: stairLen,
			floorLow:  lowNode.floor,
			floorHigh: highNode.floor,
			bidirectional,
		});
	}

	/** Dirección de la primera arista de pasillo conectada a (x,z) en ese piso */
	private findAdjacentEdgeDir(x: number, z: number, floor: number): { dx: number; dz: number } {
		for (const seg of this.edgeSegs) {
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
		const canvas = document.createElement('canvas');
		canvas.width = 320; canvas.height = 72;
		const ctx = canvas.getContext('2d')!;

		// Fondo con color del tipo de nodo (más claro para legibilidad diurna)
		const r = ((color >> 16) & 0xff);
		const g = ((color >> 8)  & 0xff);
		const b = (color & 0xff);
		ctx.fillStyle = `rgba(${r},${g},${b},0.88)`;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(ctx as any).roundRect?.(4, 4, 312, 64, 12);
		ctx.fill();

		ctx.strokeStyle = 'rgba(255,255,255,0.6)';
		ctx.lineWidth = 2; ctx.stroke();

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 22px system-ui, sans-serif';
		ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 3;
		ctx.fillText(text.slice(0, 22), 160, 36);

		const tex = new THREE.CanvasTexture(canvas);
		const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, opacity: 0 });
		const sprite = new THREE.Sprite(mat);
		sprite.scale.set(3.8, 0.85, 1);
		return sprite;
	}

	// #endregion
	// #region Posición inicial

	private placePlayerAtStart(nodes: CampusNode[]): void {
		const startId   = this.startNodeId();
		const startNode = startId ? nodes.find((n) => n.id === startId) : null;
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

		this.playerFloor = spawn.floor;
		this.currentFloor.set(spawn.floor);
		this.px = spawn.x / SCALE;
		this.pz = spawn.y / SCALE;
		this.cameraY = this.playerFloor * FLOOR_H + EYE_H;
		this.inStairZoneNow = false;

		const lookAt = refNode !== spawn
			? refNode
			: (this.destinationNodeId() ? nodes.find((n) => n.id === this.destinationNodeId()) : null);
		if (lookAt) {
			this.yaw = Math.atan2(-(lookAt.x / SCALE - this.px), -(lookAt.y / SCALE - this.pz));
		}
		this.pitch = -0.05;
		// Iniciar timer de navegación
		if (this.destinationNodeId()) {
			this.navStartTime = performance.now();
			this.lastDestId = this.destinationNodeId()!;
			this.arrivalVisible.set(false);
		}
	}

	// #endregion
	// #region Path visual

	private rebuildPath(result: PathResult | null): void {
		if (this.pathMesh) { this.scene.remove(this.pathMesh); this.pathMesh = null; }

		if (!result || result.path.length < 2) {
			// Restaurar ambiente diurno
			this.setNightMode(false);
			return;
		}

		// Oscurecer ambiente para que la ruta brille
		this.setNightMode(true);

		const group = new THREE.Group();
		group.userData = { managed: true };

		// Materiales luminosos (MeshBasicMaterial no se afecta por luces → siempre brillante)
		const stripMat    = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.5 });
		const glowMat     = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.15 });
		const chevMat     = new THREE.MeshBasicMaterial({ color: 0x86efac });
		const STEP_SPACE  = 1.2;

		for (let i = 0; i < result.path.length - 1; i++) {
			const nA = this.nodeMap.get(result.path[i]);
			const nB = this.nodeMap.get(result.path[i + 1]);
			if (!nA || !nB || nA.floor !== nB.floor) continue;

			const ax = nA.x / SCALE, az = nA.y / SCALE;
			const bx = nB.x / SCALE, bz = nB.y / SCALE;
			const fy = nA.floor * FLOOR_H + PATH_OFFSET;

			const dx = bx - ax, dz = bz - az;
			const segLen = Math.sqrt(dx * dx + dz * dz);
			if (segLen < 0.1) continue;

			const angle = Math.atan2(dx, dz);
			const cx = (ax + bx) / 2, cz = (az + bz) / 2;

			// Franja luminosa en el suelo
			const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.6, segLen), stripMat);
			strip.rotation.x = -Math.PI / 2;
			strip.rotation.z = -angle;
			strip.position.set(cx, fy, cz);
			group.add(strip);

			// Glow ancho en el suelo
			const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, segLen), glowMat);
			glow.rotation.x = -Math.PI / 2;
			glow.rotation.z = -angle;
			glow.position.set(cx, fy - 0.01, cz);
			group.add(glow);

			// Luz puntual cada ~4 unidades a lo largo de la ruta (ilumina alrededor)
			const nLights = Math.max(1, Math.floor(segLen / 4));
			for (let l = 0; l < nLights; l++) {
				const lt = (l + 0.5) / nLights;
				const pathLight = new THREE.PointLight(0x4ade80, 1.2, 5, 1.5);
				pathLight.position.set(ax + dx * lt, fy + 1.5, az + dz * lt);
				group.add(pathLight);
			}

			// Chevrones en el suelo
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

		this.pathMesh = group;
		this.scene.add(group);
	}

	/** Alterna entre ambiente diurno y nocturno para destacar la ruta */
	private setNightMode(on: boolean): void {
		if (on) {
			this.scene.background = new THREE.Color(0x1a1a2e);
			this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 60);
			this.ambientLight.intensity = 0.15;
			this.sunLight.intensity = 0.1;
			this.playerLight.intensity = 0.8;
			this.playerLight.distance = 8;
			this.playerLight.color.set(0xffffff);
		} else {
			this.scene.background = new THREE.Color(0x87ceeb);
			this.scene.fog = new THREE.Fog(0xd0e8f8, 35, 110);
			this.ambientLight.intensity = 1.5;
			this.sunLight.intensity = 2.2;
			this.playerLight.intensity = 0.4;
			this.playerLight.distance = 12;
		}
	}

	// #endregion
	// #region Game loop

	private startLoop(): void {
		this.clock.start();
		const loop = (): void => {
			this.animId = requestAnimationFrame(loop);
			const dt = Math.min(this.clock.getDelta(), 0.05);
			this.updatePlayer(dt);
			this.updateLabelVisibility();
			this.checkClosestNode();
			this.drawMinimap();
			this.renderer.render(this.scene, this.camera);
		};
		loop();
	}

	private updatePlayer(dt: number): void {
		// Giro lateral siempre activo
		if (this.keys['a'] || this.keys['arrowleft'])  this.yaw += TURN_SPEED * dt;
		if (this.keys['d'] || this.keys['arrowright']) this.yaw -= TURN_SPEED * dt;

		// Espacio (edge-triggered): ajustar posición al corredor más cercano del piso actual
		const spaceDown = !!this.keys[' '];
		if (spaceDown && !this.spaceWasDown) this.ejectToNearestCorridor();
		this.spaceWasDown = spaceDown;

		const stairNow = this.getStairAt(this.px, this.pz);

		if (stairNow) {
			// #region Movimiento en escalera: t=0 piso bajo, t=1 piso alto
			this.inStairZoneNow = true;
			const { zone, t } = stairNow;
			let tDelta = 0;
			if (this.keys['w'] || this.keys['arrowup'])   tDelta += 1;   // subir
			if (this.keys['s'] || this.keys['arrowdown']) tDelta -= 1;   // bajar
			if (this.joyDelta.y !== 0) tDelta += this.joyDelta.y;

			if (tDelta !== 0) {
				const rawNewT = t + tDelta * (MOVE_SPEED * dt) / zone.len;

				// Solo inclinar pitch suavemente (no forzar yaw para evitar giro agresivo)
				const targetPitch = tDelta > 0 ? -0.2 : 0.2;
				this.pitch += (targetPitch - this.pitch) * Math.min(1, 3 * dt);

				if (rawNewT < 0) {
					// Salir por el extremo del piso bajo
					this.playerFloor = zone.floorLow;
					this.currentFloor.set(zone.floorLow);
					this.cameraY = zone.floorLow * FLOOR_H + EYE_H;
					this.px = zone.startX; this.pz = zone.startZ;
					this.inStairZoneNow = false;
					this.stairExitCooldown = performance.now() + 350;
					this.stairMsg.set('');
					// Si el punto de salida no es walkable, eject a corredor seguro
					if (!this.isWalkableForWalls(this.px, this.pz, this.playerFloor)) {
						this.ejectToNearestCorridor();
					}
				} else if (rawNewT > 1) {
					// Salir por el extremo del piso alto
					this.playerFloor = zone.floorHigh;
					this.currentFloor.set(zone.floorHigh);
					this.cameraY = zone.floorHigh * FLOOR_H + EYE_H;
					this.px = zone.endX; this.pz = zone.endZ;
					this.inStairZoneNow = false;
					this.stairExitCooldown = performance.now() + 350;
					this.stairMsg.set('');
					if (!this.isWalkableForWalls(this.px, this.pz, this.playerFloor)) {
						this.ejectToNearestCorridor();
					}
				} else {
					this.px = zone.startX + zone.dirX * rawNewT * zone.len;
					this.pz = zone.startZ + zone.dirZ * rawNewT * zone.len;
				}
			}
			// #endregion

			// Altura e indicador solo mientras sigue en escalera
			if (this.inStairZoneNow) {
				const curT = this.getStairAt(this.px, this.pz)?.t ?? t;
				const targetCamY = THREE.MathUtils.lerp(
					zone.floorLow  * FLOOR_H + EYE_H,
					zone.floorHigh * FLOOR_H + EYE_H,
					curT,
				);
				this.cameraY += (targetCamY - this.cameraY) * Math.min(1, 18 * dt);

				const newFloor = curT < 0.5 ? zone.floorLow : zone.floorHigh;
				if (newFloor !== this.playerFloor) {
					this.playerFloor = newFloor;
					this.currentFloor.set(newFloor);
				}

				this.stairMsg.set('⬆ W/↑ Subir  |  ⬇ S/↓ Bajar');
			}

		} else {
			// #region Movimiento libre en pasillo
			if (this.inStairZoneNow) {
				this.inStairZoneNow = false;
				this.stairMsg.set('');
				this.pitch = 0;  // resetear pitch al salir de escalera
			}

			const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
			let mx = 0, mz = 0;

			if (this.keys['w'] || this.keys['arrowup'])   { mx -= sinY; mz -= cosY; }
			if (this.keys['s'] || this.keys['arrowdown']) { mx += sinY; mz += cosY; }
			if (this.joyDelta.y !== 0) { mx -= sinY * this.joyDelta.y; mz -= cosY * this.joyDelta.y; }
			if (this.joyDelta.x !== 0) { mx +=  cosY * this.joyDelta.x; mz += -sinY * this.joyDelta.x; }

			if (mx !== 0 || mz !== 0) {
				const len   = Math.sqrt(mx * mx + mz * mz);
				const speed = MOVE_SPEED * dt;
				const ndx   = (mx / len) * speed;
				const ndz   = (mz / len) * speed;
				const r     = this.resolveMovement(this.px, this.pz, this.px + ndx, this.pz + ndz);
				this.px = r.x; this.pz = r.z;
			}
			// #endregion

			const targetY = this.playerFloor * FLOOR_H + EYE_H;
			this.cameraY += (targetY - this.cameraY) * Math.min(1, FLOOR_LERP_SPEED * dt);
		}

		this.camera.position.set(this.px, this.cameraY, this.pz);
		this.camera.rotation.y = this.yaw;
		this.camera.rotation.x = this.pitch;
		this.playerLight.position.set(this.px, this.cameraY + 1.5, this.pz);
	}

	/**
	 * Actualiza la visibilidad de las etiquetas según el ángulo y distancia de la cámara.
	 * Un label solo aparece cuando la cámara lo "apunta" (dentro del cono de visión).
	 */
	private updateLabelVisibility(): void {
		this.camera.getWorldDirection(this._camDir);
		for (const entry of this.labelEntries) {
			this._toSprite.subVectors(entry.pos, this.camera.position);
			const dist = this._toSprite.length();
			this._toSprite.divideScalar(dist || 1);
			const dot = this._camDir.dot(this._toSprite);
			const target = (dot > LABEL_VIEW_DOT && dist < LABEL_VIEW_DIST) ? 1.0 : 0.0;
			const mat = entry.sprite.material as THREE.SpriteMaterial;
			mat.opacity += (target - mat.opacity) * 0.12;  // transición suave
		}
	}

	// #endregion
	// #region Walkability + colisión

	private resolveMovement(ox: number, oz: number, nx: number, nz: number): Vec2 {
		if (this.isWalkable(nx, nz)) return { x: nx, z: nz };
		if (this.isWalkable(nx, oz)) return { x: nx, z: oz };
		if (this.isWalkable(ox, nz)) return { x: ox, z: nz };
		return { x: ox, z: oz };
	}

	/**
	 * Posición walkable si:
	 * 1. Está dentro de una zona de escalera activa, O
	 * 2. Está cerca de una arista de pasillo del piso actual Y no dentro de un salón
	 */
	private isWalkable(x: number, z: number): boolean {
		if (this.getStairAt(x, z)) return true;

		let nearEdge = false;
		for (const seg of this.edgeSegs) {
			if (seg.floor !== this.playerFloor) continue;
			if (this.distToSeg(x, z, seg.ax, seg.az, seg.bx, seg.bz) <= CORRIDOR_R) {
				nearEdge = true;
				break;
			}
		}
		if (!nearEdge) return false;

		for (const box of this.roomBoxes) {
			if (box.floor !== this.playerFloor) continue;
			if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) return false;
		}
		return true;
	}

	/**
	 * Detecta si el jugador está en la zona de una escalera y devuelve t ∈ [0,1].
	 *
	 * Lógica de entrada con hysteresis (inStairZoneNow) para evitar que el
	 * jugador sea capturado por el extremo EQUIVOCADO de la escalera:
	 * - Si NO está en escalera: solo entra desde el extremo de su piso actual.
	 * - Si YA está en escalera: acepta cualquier t (permite recorrer completa).
	 */
	private getStairAt(x: number, z: number): { zone: StairZone; t: number } | null {
		// Bloquear re-entrada durante el cooldown de salida
		if (performance.now() < this.stairExitCooldown) return null;

		for (const sz of this.stairZones) {
			const toX = x - sz.startX, toZ = z - sz.startZ;
			const proj = toX * sz.dirX + toZ * sz.dirZ;
			const tRaw = proj / sz.len;

			if (tRaw < -0.12 || tRaw > 1.12) continue;

			const clampedProj = Math.max(0, Math.min(sz.len, proj));
			const closestX = sz.startX + sz.dirX * clampedProj;
			const closestZ = sz.startZ + sz.dirZ * clampedProj;
			const lateral  = Math.sqrt((x - closestX) ** 2 + (z - closestZ) ** 2);
			if (lateral > STAIR_WIDTH / 2 + 0.22) continue;

			// Hysteresis: si no está en escalera, restringir entrada según piso actual
			if (!this.inStairZoneNow) {
				const fromLow  = this.playerFloor === sz.floorLow  && tRaw <= 0.18;
				const fromHigh = this.playerFloor === sz.floorHigh && tRaw >= 0.82;
				if (!fromLow && !fromHigh) continue;
			}

			return { zone: sz, t: Math.max(0, Math.min(1, tRaw)) };
		}
		return null;
	}

	/**
	 * Tecla Espacio: teletransporta al nodo no-escalera más cercano del piso actual.
	 * Los nodos de tipo 'corridor' son puntos garantizados lejos de zonas de escalera.
	 * Usar nodos (no puntos en aristas) evita que el destino quede dentro del stairZone.
	 */
	private ejectToNearestCorridor(): void {
		const nodes = this.nodes();
		let bestX = this.px, bestZ = this.pz, bestDist = Infinity;

		// Primero intentar nodos corredor (garantizado walkable y lejos de escaleras)
		for (const n of nodes) {
			if (n.floor !== this.playerFloor) continue;
			if (n.type !== 'corridor') continue;
			const nx = n.x / SCALE, nz = n.y / SCALE;
			const d  = Math.sqrt((this.px - nx) ** 2 + (this.pz - nz) ** 2);
			if (d < bestDist && this.isWalkableForWalls(nx, nz, this.playerFloor)) {
				bestDist = d; bestX = nx; bestZ = nz;
			}
		}

		// Fallback: cualquier nodo no-escalera que sea walkable
		if (bestDist === Infinity) {
			for (const n of nodes) {
				if (n.floor !== this.playerFloor) continue;
				if (n.type === 'stairs') continue;
				const nx = n.x / SCALE, nz = n.y / SCALE;
				const d  = Math.sqrt((this.px - nx) ** 2 + (this.pz - nz) ** 2);
				if (d < bestDist) { bestDist = d; bestX = nx; bestZ = nz; }
			}
		}

		// Fallback final: buscar punto walkable en la arista más cercana
		if (!this.isWalkableForWalls(bestX, bestZ, this.playerFloor)) {
			for (const seg of this.edgeSegs) {
				if (seg.floor !== this.playerFloor) continue;
				const mx = (seg.ax + seg.bx) / 2, mz = (seg.az + seg.bz) / 2;
				if (this.isWalkableForWalls(mx, mz, this.playerFloor)) {
					const d = Math.sqrt((this.px - mx) ** 2 + (this.pz - mz) ** 2);
					if (d < bestDist) { bestDist = d; bestX = mx; bestZ = mz; }
				}
			}
		}

		this.px = bestX;
		this.pz = bestZ;
		this.cameraY = this.playerFloor * FLOOR_H + EYE_H;
		this.pitch = 0;
		this.inStairZoneNow    = false;
		this.stairExitCooldown = performance.now() + 1500;
		this.stairMsg.set('');
	}

	retryNavigation(): void {
		this.arrivalVisible.set(false);
		this.placePlayerAtStart(this.nodes());
		this.navStartTime = performance.now();
	}

	/** Versión de isWalkable para generación de muros — usa piso explícito, ignora escaleras */
	private isWalkableForWalls(x: number, z: number, floor: number): boolean {
		let nearEdge = false;
		for (const seg of this.edgeSegs) {
			if (seg.floor !== floor) continue;
			if (this.distToSeg(x, z, seg.ax, seg.az, seg.bx, seg.bz) <= CORRIDOR_R) {
				nearEdge = true;
				break;
			}
		}
		if (!nearEdge) {
			// También verificar zonas de escalera
			for (const sz of this.stairZones) {
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
		for (const box of this.roomBoxes) {
			if (box.floor !== floor) continue;
			if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) return false;
		}
		return true;
	}

	private distToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
		const dx = bx - ax, dz = bz - az;
		const lenSq = dx * dx + dz * dz;
		if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2);
		const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
		return Math.sqrt((px - ax - t * dx) ** 2 + (pz - az - t * dz) ** 2);
	}

	// #endregion
	// #region Closest node → recálculo de ruta

	private checkClosestNode(): void {
		const now = performance.now();
		if (now - this.lastRecalcTime < NODE_RECALC_MS) return;
		this.lastRecalcTime = now;

		const nodes = this.nodes();
		let nearest: CampusNode | null = null;
		let minD = Infinity;
		for (const n of nodes) {
			if (n.floor !== this.playerFloor) continue;
			const dx = n.x / SCALE - this.px;
			const dz = n.y / SCALE - this.pz;
			const d  = dx * dx + dz * dz;
			if (d < minD) { minD = d; nearest = n; }
		}
		if (nearest && nearest.id !== this.closestNodeId) {
			this.closestNodeId = nearest.id;
			this.closestNodeChange.emit(nearest.id);
		}

		// Detección de llegada al destino
		const destId = this.destinationNodeId();
		if (destId && nearest && nearest.id === destId && Math.sqrt(minD) < 3 && !this.arrivalVisible()) {
			this._arrivalTimeMs.set(performance.now() - this.navStartTime);
			this.arrivalVisible.set(true);
		}
	}

	// #endregion
	// #region Minimap

	private drawMinimap(): void {
		const canvas = this.minimapRef?.nativeElement;
		if (!canvas) return;
		const ctx = canvas.getContext('2d')!;
		const W = canvas.width, H = canvas.height, PAD = 10;

		const floorNodes = this.nodes().filter((n) => n.floor === this.playerFloor);
		ctx.clearRect(0, 0, W, H);
		ctx.fillStyle = 'rgba(240,236,228,0.95)';   // beige claro (diurno)
		ctx.fillRect(0, 0, W, H);
		if (!floorNodes.length) return;

		let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
		for (const n of floorNodes) {
			minX = Math.min(minX, n.x); minZ = Math.min(minZ, n.y);
			maxX = Math.max(maxX, n.x); maxZ = Math.max(maxZ, n.y);
		}
		for (const sz of this.stairZones) {
			if (sz.floorLow !== this.playerFloor && sz.floorHigh !== this.playerFloor) continue;
			minX = Math.min(minX, sz.startX * SCALE - 5, sz.endX * SCALE - 5);
			maxX = Math.max(maxX, sz.startX * SCALE + 5, sz.endX * SCALE + 5);
			minZ = Math.min(minZ, sz.startZ * SCALE - 5, sz.endZ * SCALE - 5);
			maxZ = Math.max(maxZ, sz.startZ * SCALE + 5, sz.endZ * SCALE + 5);
		}

		const rX = maxX - minX || 1, rZ = maxZ - minZ || 1;
		const toMx = (x: number): number => PAD + ((x - minX) / rX) * (W - PAD * 2);
		const toMz = (z: number): number => PAD + ((z - minZ) / rZ) * (H - PAD * 2);

		// Aristas de pasillo
		for (const seg of this.edgeSegs.filter((s) => s.floor === this.playerFloor)) {
			ctx.beginPath();
			ctx.strokeStyle = 'rgba(100,130,180,0.65)';
			ctx.lineWidth = 3;
			ctx.moveTo(toMx(seg.ax * SCALE), toMz(seg.az * SCALE));
			ctx.lineTo(toMx(seg.bx * SCALE), toMz(seg.bz * SCALE));
			ctx.stroke();
		}

		// Escaleras (ámbar)
		for (const sz of this.stairZones) {
			if (sz.floorLow !== this.playerFloor && sz.floorHigh !== this.playerFloor) continue;
			ctx.beginPath();
			ctx.strokeStyle = '#b45309';
			ctx.lineWidth = 3.5;
			ctx.moveTo(toMx(sz.startX * SCALE), toMz(sz.startZ * SCALE));
			ctx.lineTo(toMx(sz.endX   * SCALE), toMz(sz.endZ   * SCALE));
			ctx.stroke();
			// Icono de escalera en el inicio
			ctx.fillStyle = '#f59e0b';
			ctx.font = '10px system-ui';
			ctx.fillText('⬆', toMx(sz.startX * SCALE) - 5, toMz(sz.startZ * SCALE) + 4);
		}

		// Path activo
		const result = this.pathResult();
		if (result && result.path.length > 1) {
			ctx.beginPath();
			ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 2.5;
			let first = true, prevOnFloor = false;
			for (const id of result.path) {
				const n = this.nodeMap.get(id);
				const onFloor = n != null && n.floor === this.playerFloor;
				if (!onFloor) { if (prevOnFloor) first = true; prevOnFloor = false; continue; }
				if (first) { ctx.moveTo(toMx(n.x), toMz(n.y)); first = false; }
				else        { ctx.lineTo(toMx(n.x), toMz(n.y)); }
				prevOnFloor = true;
			}
			ctx.stroke();
		}

		// Habitaciones (colores de colegio)
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

		// Destino
		const destId = this.destinationNodeId();
		if (destId) {
			const dn = this.nodeMap.get(destId);
			if (dn && dn.floor === this.playerFloor) {
				ctx.beginPath();
				ctx.fillStyle = '#dc2626';
				ctx.arc(toMx(dn.x), toMz(dn.y), 5.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
			}
		}

		// Cono de visión del jugador
		const pmx = toMx(this.px * SCALE), pmz = toMz(this.pz * SCALE);
		ctx.save();
		ctx.translate(pmx, pmz);
		ctx.rotate(-this.yaw - Math.PI / 2);
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

	// #endregion
	// #region Pantalla completa

	toggleFullscreen(): void {
		if (!document.fullscreenElement) {
			const el = this.canvasRef.nativeElement.closest('.overlay3d') as HTMLElement | null;
			(el ?? document.documentElement).requestFullscreen();
		} else {
			document.exitFullscreen();
		}
	}

	private readonly onFullscreenChange = (): void => {
		const isFull = !!document.fullscreenElement;
		this.isFullscreen.set(isFull);
		// Forzar resize — en fullscreen el canvas puede no reportar tamaño correcto de inmediato
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

	// #endregion
	// #region Teclado

	private readonly onKeyDown = (e: KeyboardEvent): void => {
		const k = e.key.toLowerCase();
		this.keys[k] = true;
		if (k === 'escape') this.close.emit();
		if (['w','s','a','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
	};
	private readonly onKeyUp = (e: KeyboardEvent): void => { this.keys[e.key.toLowerCase()] = false; };

	private setupKeyboard(): void {
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup',   this.onKeyUp);
	}

	// #endregion
	// #region Ratón

	onMouseDown(e: MouseEvent): void {
		if (e.button === 0 || e.button === 2) { this.mouseDown = true; this.lastMouse = { x: e.clientX, y: e.clientY }; }
	}
	onMouseMove(e: MouseEvent): void {
		if (!this.mouseDown) return;
		this.yaw   -= (e.clientX - this.lastMouse.x) * LOOK_SENS;
		this.pitch -= (e.clientY - this.lastMouse.y) * LOOK_SENS;
		this.pitch  = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
		this.lastMouse = { x: e.clientX, y: e.clientY };
	}
	onMouseUp(): void { this.mouseDown = false; }

	// #endregion
	// #region Joystick

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
		this.yaw   -= (t.clientX - this.lookTouchLast.x) * TOUCH_LOOK_SENS;
		this.pitch -= (t.clientY - this.lookTouchLast.y) * TOUCH_LOOK_SENS;
		this.pitch  = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
		this.lookTouchLast = { x: t.clientX, y: t.clientY };
	}
	lookTouchEnd(): void { this.lookTouchId = null; }

	// #endregion
	// #region Resize

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
