import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CampusEdge, CampusNode } from '../../models';
import { CAMPUS_EDGES } from '../../config';

@Component({
	selector: 'app-campus-map',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="campus-map-container">
			<svg
				viewBox="0 0 1000 800"
				xmlns="http://www.w3.org/2000/svg"
				class="campus-svg"
			>
				<!-- ============ Edges (conexiones entre nodos) ============ -->
				@for (edge of floorEdges(); track edge.from + edge.to) {
					<line
						[attr.x1]="getNodeX(edge.from)"
						[attr.y1]="getNodeY(edge.from)"
						[attr.x2]="getNodeX(edge.to)"
						[attr.y2]="getNodeY(edge.to)"
						class="edge-line"
					/>
				}

				<!-- ============ Path animado ============ -->
				@if (pathPoints()) {
					<polyline
						[attr.points]="pathPoints()"
						class="path-line"
					/>
				}

				<!-- ============ Nodos ============ -->
				@for (node of nodes(); track node.id) {
					<g
						class="node-group"
						[class.clickable]="node.type !== 'corridor'"
						[class.start-node]="node.id === startNodeId()"
						[class.dest-node]="node.id === destinationNodeId()"
						(click)="onNodeClick(node)"
					>
						@if (node.type === 'corridor') {
							<!-- Corredor: círculo pequeño -->
							<circle
								[attr.cx]="node.x"
								[attr.cy]="node.y"
								r="6"
								class="corridor-dot"
							/>
						} @else {
							<!-- Room/lugar: rectángulo con label -->
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
						}
					</g>
				}

				<!-- ============ Marcadores de inicio/destino ============ -->
				@if (startNode(); as sn) {
					<circle
						[attr.cx]="sn.x"
						[attr.cy]="sn.y - (sn.height || 50) / 2 - 10"
						r="8"
						class="marker-start"
					/>
				}
				@if (destNode(); as dn) {
					<circle
						[attr.cx]="dn.x"
						[attr.cy]="dn.y - (dn.height || 50) / 2 - 10"
						r="8"
						class="marker-dest"
					/>
				}
			</svg>
		</div>
	`,
	styles: `
		.campus-map-container {
			border: 1px solid var(--surface-border);
			border-radius: 8px;
			overflow: hidden;
			background: var(--surface-0);
		}

		.campus-svg {
			width: 100%;
			height: auto;
			display: block;
		}

		// ============ Edges ============
		.edge-line {
			stroke: var(--surface-300);
			stroke-width: 1.5;
			stroke-dasharray: 4, 4;
		}

		// ============ Path animado ============
		.path-line {
			fill: none;
			stroke: var(--primary-color);
			stroke-width: 4;
			stroke-linecap: round;
			stroke-linejoin: round;
			stroke-dasharray: 12, 6;
			animation: pathPulse 1.5s linear infinite;
		}

		@keyframes pathPulse {
			to {
				stroke-dashoffset: -18;
			}
		}

		// ============ Nodos ============
		.node-group {
			&.clickable {
				cursor: pointer;

				&:hover .node-rect {
					stroke-width: 2.5;
					filter: brightness(1.1);
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

		.node-rect {
			stroke-width: 1.5;
			transition: all 0.15s;
		}

		.node-classroom {
			fill: #dbeafe;
			stroke: #3b82f6;
		}

		.node-stairs {
			fill: #fef3c7;
			stroke: #f59e0b;
		}

		.node-entrance {
			fill: #d1fae5;
			stroke: #10b981;
		}

		.node-patio {
			fill: #ecfdf5;
			stroke: #6ee7b7;
		}

		.node-bathroom {
			fill: #e0f2fe;
			stroke: #0ea5e9;
		}

		.node-office {
			fill: #f3f4f6;
			stroke: #6b7280;
		}

		.node-label {
			font-size: 11px;
			font-weight: 600;
			fill: var(--text-color, #1e293b);
			pointer-events: none;
			user-select: none;
		}

		.corridor-dot {
			fill: var(--surface-300);
			stroke: var(--surface-400);
			stroke-width: 1;
		}

		// ============ Marcadores ============
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

		@keyframes destPulse {
			0%,
			100% {
				r: 8;
			}
			50% {
				r: 11;
			}
		}
	`,
})
export class CampusMapComponent {
	readonly nodes = input.required<CampusNode[]>();
	readonly selectedFloor = input.required<number>();
	readonly pathPoints = input<string>('');
	readonly startNodeId = input<string | null>(null);
	readonly destinationNodeId = input<string | null>(null);

	readonly nodeClick = output<string>();

	// ============ Computed ============

	private readonly nodeMap = computed(() => new Map(this.nodes().map((n) => [n.id, n])));

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

	/**
	 * Edges filtradas para el piso actual
	 */
	readonly floorEdges = computed((): CampusEdge[] => {
		const map = this.nodeMap();
		const floor = this.selectedFloor();

		return CAMPUS_EDGES.filter((e) => {
			const from = map.get(e.from);
			const to = map.get(e.to);
			return from && to && from.floor === floor && to.floor === floor;
		});
	});

	// ============ Helpers para template ============

	getNodeX(nodeId: string): number {
		return this.nodeMap().get(nodeId)?.x ?? 0;
	}

	getNodeY(nodeId: string): number {
		return this.nodeMap().get(nodeId)?.y ?? 0;
	}

	onNodeClick(node: CampusNode): void {
		if (node.type !== 'corridor') {
			this.nodeClick.emit(node.id);
		}
	}
}
