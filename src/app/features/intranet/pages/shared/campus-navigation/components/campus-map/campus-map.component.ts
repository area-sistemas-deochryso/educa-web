import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CampusEdge, CampusNode } from '../../models';

// Ancho del corredor en coordenadas SVG (proporcional al CORRIDOR_R del 3D)
const CORRIDOR_W = 32;

@Component({
	selector: 'app-campus-map',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="campus-map-container">
			<svg
				[attr.viewBox]="viewBox()"
				xmlns="http://www.w3.org/2000/svg"
				class="campus-svg"
			>
				<defs>
					<!-- Filtro de glow para el path -->
					<filter id="path-blur">
						<feGaussianBlur stdDeviation="3" />
					</filter>
				</defs>

				<!-- #region Fondo del edificio -->
				<rect
					[attr.x]="buildingBounds().minX"
					[attr.y]="buildingBounds().minY"
					[attr.width]="buildingBounds().w"
					[attr.height]="buildingBounds().h"
					rx="12"
					class="building-bg"
				/>
				<!-- #endregion -->

				<!-- #region Zonas caminables (pasillos) -->
				@for (seg of walkableSegs(); track seg.id) {
					<line
						[attr.x1]="seg.x1" [attr.y1]="seg.y1"
						[attr.x2]="seg.x2" [attr.y2]="seg.y2"
						class="walkable-corridor"
						[attr.stroke-width]="corridorWidth"
					/>
				}
				<!-- #endregion -->

				<!-- #region Path: glow + huellas de pasos -->
				@if (pathSegments().length > 0) {
					<!-- Banda de brillo del camino -->
					@for (seg of pathSegments(); track seg.id) {
						<line
							[attr.x1]="seg.x1" [attr.y1]="seg.y1"
							[attr.x2]="seg.x2" [attr.y2]="seg.y2"
							class="path-glow"
						/>
					}
					<!-- Huellas de pasos animadas -->
					@for (fp of footprints(); track fp.id) {
						<g [attr.transform]="'translate(' + fp.x + ',' + fp.y + ') rotate(' + fp.angle + ')'"
							class="footprint"
							[style.animation-delay]="fp.delay * 3 + 's'"
						>
							<!-- Huella: óvalo + dedos -->
							<ellipse
								[attr.cx]="fp.left ? -4 : 4"
								cy="0"
								rx="4" ry="6"
								class="foot-sole"
							/>
							<!-- Dedos -->
							<circle [attr.cx]="fp.left ? -6 : 2" cy="-5" r="1.5" class="foot-toe"/>
							<circle [attr.cx]="fp.left ? -3 : 5" cy="-6" r="1.5" class="foot-toe"/>
							<circle [attr.cx]="fp.left ? -1 : 7" cy="-5" r="1.3" class="foot-toe"/>
						</g>
					}
				}
				<!-- #endregion -->

				<!-- #region Nodos -->
				@for (node of nodes(); track node.id) {
					@if (node.type !== 'corridor') {
						<g
							class="node-group clickable"
							[class.start-node]="node.id === startNodeId()"
							[class.dest-node]="node.id === destinationNodeId()"
							(click)="onNodeClick(node)"
						>
							<rect
								[attr.x]="node.x - (node.width || 80) / 2"
								[attr.y]="node.y - (node.height || 50) / 2"
								[attr.width]="node.width || 80"
								[attr.height]="node.height || 50"
								[attr.rx]="6"
								[class]="'node-rect node-' + node.type"
							/>
							<text
								[attr.x]="node.x"
								[attr.y]="node.y + 1"
								class="node-label"
								text-anchor="middle"
								dominant-baseline="middle"
							>
								{{ node.label }}
							</text>
						</g>
					}
				}
				<!-- #endregion -->

				<!-- #region Nodos corredor (puntos pequeños) -->
				@for (node of corridorNodes(); track node.id) {
					<circle
						[attr.cx]="node.x"
						[attr.cy]="node.y"
						r="4"
						class="corridor-dot"
					/>
				}
				<!-- #endregion -->

				<!-- #region Marcadores de inicio/destino -->
				@if (startNode(); as sn) {
					<circle
						[attr.cx]="sn.x"
						[attr.cy]="sn.y - (sn.height || 50) / 2 - 12"
						r="9"
						class="marker-start"
					/>
					<text
						[attr.x]="sn.x"
						[attr.y]="sn.y - (sn.height || 50) / 2 - 11"
						class="marker-label" text-anchor="middle" dominant-baseline="middle"
					>📍</text>
				}
				@if (destNode(); as dn) {
					<circle
						[attr.cx]="dn.x"
						[attr.cy]="dn.y - (dn.height || 50) / 2 - 12"
						r="9"
						class="marker-dest"
					/>
					<text
						[attr.x]="dn.x"
						[attr.y]="dn.y - (dn.height || 50) / 2 - 11"
						class="marker-label" text-anchor="middle" dominant-baseline="middle"
					>🎯</text>
				}
				<!-- #endregion -->
			</svg>
		</div>
	`,
	styles: `
		.campus-map-container {
			border: 1px solid var(--surface-border);
			border-radius: 12px;
			overflow: hidden;
			background: var(--surface-ground, #f0ece4);
		}

		.campus-svg {
			width: 100%;
			height: auto;
			display: block;
		}

		// #region Edificio y pasillos
		.building-bg {
			fill: var(--surface-100, #e8e4dc);
			stroke: var(--surface-300, #c8c0b4);
			stroke-width: 2;
		}

		.walkable-corridor {
			stroke: var(--surface-200, #d4cec4);
			stroke-linecap: round;
		}

		.corridor-dot {
			fill: var(--surface-300, #c0b8ac);
			stroke: none;
		}
		// #endregion

		// #region Path: glow + huellas
		.path-glow {
			stroke: #22c55e;
			stroke-width: 20;
			stroke-linecap: round;
			stroke-opacity: 0.1;
			animation: glowPulse 2s ease-in-out infinite;
		}

		@keyframes glowPulse {
			0%, 100% { stroke-opacity: 0.06; }
			50% { stroke-opacity: 0.18; }
		}

		.footprint {
			animation: stepFade 3s ease-in-out infinite;
		}

		.foot-sole {
			fill: #6b7280;
			opacity: 0.6;
		}

		.foot-toe {
			fill: #6b7280;
			opacity: 0.6;
		}

		@keyframes stepFade {
			0%, 100% { opacity: 0.15; }
			30%, 70% { opacity: 0.8; }
		}
		// #endregion

		// #region Nodos
		.node-group {
			&.clickable {
				cursor: pointer;
				&:hover .node-rect {
					stroke-width: 2.5;
					filter: brightness(1.08);
				}
			}
			&.start-node .node-rect {
				stroke: #22c55e;
				stroke-width: 3;
			}
			&.dest-node .node-rect {
				stroke: #ef4444;
				stroke-width: 3;
			}
		}

		.node-rect { stroke-width: 1.5; transition: all 0.15s; }
		.node-classroom { fill: #dbeafe; stroke: #3b82f6; }
		.node-stairs    { fill: #fef3c7; stroke: #f59e0b; }
		.node-entrance  { fill: #d1fae5; stroke: #10b981; }
		.node-patio     { fill: #ecfdf5; stroke: #6ee7b7; }
		.node-bathroom  { fill: #e0f2fe; stroke: #0ea5e9; }
		.node-office    { fill: #f3f4f6; stroke: #6b7280; }

		.node-label {
			font-size: 11px;
			font-weight: 600;
			fill: var(--text-color, #1e293b);
			pointer-events: none;
			user-select: none;
		}
		// #endregion

		// #region Marcadores
		.marker-start {
			fill: #22c55e;
			stroke: #ffffff;
			stroke-width: 2;
		}
		.marker-dest {
			fill: #ef4444;
			stroke: #ffffff;
			stroke-width: 2;
			animation: destPulse 1s ease-in-out infinite;
		}
		.marker-label {
			font-size: 12px;
			pointer-events: none;
		}

		@keyframes destPulse {
			0%, 100% { r: 9; }
			50% { r: 12; }
		}
		// #endregion
	`,
})
export class CampusMapComponent {
	// #region Inputs / Outputs
	readonly nodes = input.required<CampusNode[]>();
	readonly edges = input.required<CampusEdge[]>();
	readonly selectedFloor = input.required<number>();
	readonly pathPoints = input<string>('');
	readonly startNodeId = input<string | null>(null);
	readonly destinationNodeId = input<string | null>(null);

	readonly nodeClick = output<string>();

	readonly corridorWidth = CORRIDOR_W;
	// #endregion

	// #region Computed
	private readonly nodeMap = computed(() => new Map(this.nodes().map((n) => [n.id, n])));

	readonly corridorNodes = computed(() => this.nodes().filter((n) => n.type === 'corridor'));

	/** Bounds del edificio para el fondo */
	readonly buildingBounds = computed(() => {
		const all = this.nodes();
		if (!all.length) return { minX: 0, minY: 0, w: 800, h: 600 };
		const PAD = 40;
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const n of all) {
			const hw = (n.width ?? 80) / 2 + 10;
			const hh = (n.height ?? 50) / 2 + 10;
			minX = Math.min(minX, n.x - hw);
			minY = Math.min(minY, n.y - hh);
			maxX = Math.max(maxX, n.x + hw);
			maxY = Math.max(maxY, n.y + hh);
		}
		return { minX: minX - PAD, minY: minY - PAD, w: maxX - minX + PAD * 2, h: maxY - minY + PAD * 2 };
	});

	readonly viewBox = computed(() => {
		const b = this.buildingBounds();
		return `${b.minX} ${b.minY} ${b.w} ${b.h}`;
	});

	/** Segmentos de zona caminable (pasillos visuales) */
	readonly walkableSegs = computed(() => {
		const nm = this.nodeMap();
		return this.edges().map((e, i) => {
			const from = nm.get(e.from);
			const to = nm.get(e.to);
			if (!from || !to) return null;
			return { id: `ws-${i}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y };
		}).filter((s): s is NonNullable<typeof s> => s !== null);
	});

	/** Segmentos del path */
	readonly pathSegments = computed(() => {
		const pts = this.pathPoints();
		if (!pts) return [];
		const coords = pts.trim().split(/\s+/).map((p) => {
			const [x, y] = p.split(',').map(Number);
			return { x, y };
		}).filter((p) => !isNaN(p.x) && !isNaN(p.y));

		const segs: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
		for (let i = 0; i < coords.length - 1; i++) {
			segs.push({
				id: `ps-${i}`,
				x1: coords[i].x, y1: coords[i].y,
				x2: coords[i + 1].x, y2: coords[i + 1].y,
			});
		}
		return segs;
	});

	/** Huellas de pasos a lo largo del path */
	readonly footprints = computed(() => {
		const segs = this.pathSegments();
		if (!segs.length) return [];

		const STEP = 22; // distancia entre huellas en coords SVG
		const prints: { id: string; x: number; y: number; angle: number; left: boolean; delay: number }[] = [];
		let idx = 0;
		let totalDist = 0;

		for (const seg of segs) {
			const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
			const len = Math.sqrt(dx * dx + dy * dy);
			if (len < 1) continue;
			const angle = Math.atan2(dy, dx) * 180 / Math.PI;
			const steps = Math.max(1, Math.floor(len / STEP));

			for (let s = 0; s < steps; s++) {
				const t = (s + 0.5) / steps;
				const left = idx % 2 === 0;
				prints.push({
					id: `fp-${idx}`,
					x: seg.x1 + dx * t,
					y: seg.y1 + dy * t,
					angle,
					left,
					delay: totalDist + len * t,
				});
				idx++;
			}
			totalDist += len;
		}

		// Normalizar delay para animación (0-1)
		const maxDist = totalDist || 1;
		return prints.map((p) => ({ ...p, delay: p.delay / maxDist }));
	});

	readonly startNode = computed(() => {
		const id = this.startNodeId();
		if (!id) return null;
		const n = this.nodeMap().get(id);
		return n && n.floor === this.selectedFloor() ? n : null;
	});

	readonly destNode = computed(() => {
		const id = this.destinationNodeId();
		if (!id) return null;
		const n = this.nodeMap().get(id);
		return n && n.floor === this.selectedFloor() ? n : null;
	});
	// #endregion

	// #region Event handlers
	onNodeClick(node: CampusNode): void {
		if (node.type !== 'corridor') {
			this.nodeClick.emit(node.id);
		}
	}
	// #endregion
}
