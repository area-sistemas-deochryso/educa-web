import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CampusEdge, CampusNode } from '../../models';

// Ancho del corredor en coordenadas SVG (proporcional al CORRIDOR_R del 3D)
const CORRIDOR_W = 32;

@Component({
	selector: 'app-campus-map',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './campus-map.component.html',
	styleUrl: './campus-map.component.scss',
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
