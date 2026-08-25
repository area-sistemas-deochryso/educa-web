/* eslint-disable max-lines -- Razón: soporte táctil (brief 462) agrega pointer events + pinch-zoom sobre el patrón preexistente de estado duplicado nodo/bloqueo (ya duplicado antes de este cambio). Toda la lógica pura reusable ya está extraída a campus-editor.helpers.ts; fusionar node/bloqueo en un único drag state genérico es un refactor de mayor alcance que el brief no pidió. */
import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';


import { CampusNodoDto, CampusAristaDto, CampusBloqueoDto, EditorTool } from '../../models';
import {
	NODE_TYPE_LABELS,
	getNodeColor as getNodeColorHelper,
	getNodeLabel as getNodeLabelHelper,
	clientToSvg as clientToSvgHelper,
	svgToScreen as svgToScreenHelper,
	computeTooltipData,
	computePointerDistance,
	computePointerCenter,
	computeZoomedViewBox,
	computeDragDelta as computeDragDeltaHelper,
	computeMovedPayload,
	computeNodeTipPoint,
	computeBloqueoTipPoint,
	computeAristaTooltipScreenPos,
	classifyPointerGesture,
} from './campus-editor.helpers';
import { EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-campus-editor',
	standalone: true,
	imports: [EduTooltip],
	templateUrl: './campus-editor.component.html',
	styleUrl: './campus-editor.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusEditorComponent {
	// #region Inputs / Outputs

	readonly nodos = input<CampusNodoDto[]>([]);
	readonly aristas = input<CampusAristaDto[]>([]);
	readonly bloqueos = input<CampusBloqueoDto[]>([]);
	readonly activeTool = input<EditorTool>('select');
	readonly selectedNodeId = input<number | null>(null);
	readonly selectedAristaId = input<number | null>(null);
	readonly selectedBloqueoId = input<number | null>(null);
	readonly edgeStartNodeId = input<number | null>(null);
	readonly nodosConConexionVertical = input<Set<number>>(new Set());
	readonly loading = input(false);

	readonly editorClick = output<{ x: number; y: number }>();
	readonly nodeClick = output<number>();
	readonly nodeDblClick = output<number>();
	readonly nodeMoved = output<{ id: number; x: number; y: number }>();
	readonly aristaClick = output<number>();
	readonly bloqueoClick = output<number>();
	readonly bloqueoDblClick = output<number>();
	readonly bloqueoMoved = output<{ id: number; x: number; y: number }>();

	// #endregion

	// #region Estado local

	readonly viewBox = signal({ x: 0, y: 0, w: 1000, h: 700 });
	private isPanning = false;
	private panStart = { x: 0, y: 0 };

	// Estado de pointers activos (soporte táctil / pinch-zoom)
	private readonly activePointers = new Map<number, { x: number; y: number }>();
	private pinchStartDistance = 0;
	private pinchStartViewBox = { x: 0, y: 0, w: 1000, h: 700 };

	// Estado de arrastre (nodos)
	private isDragging = false;
	private dragNodeId: number | null = null;
	private dragStarted = false;
	readonly dragOffset = signal<{ id: number; dx: number; dy: number } | null>(null);

	// Estado de arrastre (bloqueos)
	private isDraggingBloqueo = false;
	private dragBloqueoId: number | null = null;
	private dragBloqueoStarted = false;
	readonly dragBloqueoOffset = signal<{ id: number; dx: number; dy: number } | null>(null);

	// Tooltip al pasar el cursor
	readonly hoverInfo = signal<{ type: 'node' | 'arista' | 'bloqueo'; id: number } | null>(null);
	readonly tooltipPos = signal({ x: 0, y: 0 });

	readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svgEl');

	// #endregion

	// #region Computed

	readonly nodoMap = computed(() => {
		const map = new Map<number, CampusNodoDto>();
		for (const n of this.nodos()) map.set(n.id, n);
		return map;
	});

	readonly cursorClass = computed(() => {
		const tool = this.activeTool();
		switch (tool) {
			case 'addNode':
			case 'addBlock':
				return 'cursor-crosshair';
			case 'delete':
				return 'cursor-delete';
			case 'addEdge':
			case 'addVertical':
				return 'cursor-edge';
			default:
				return 'cursor-default';
		}
	});

	private readonly nodeTypeLabelMap = NODE_TYPE_LABELS;

	readonly tooltipData = computed(() =>
		computeTooltipData(
			this.hoverInfo(),
			this.nodoMap(),
			this.nodeColorMap(),
			this.nodeTypeLabelMap,
			this.bloqueos(),
			this.aristas(),
		),
	);

	// #endregion

	// #region Computed (positions & labels for template)

	readonly nodePositions = computed(() => {
		const drag = this.dragOffset();
		const map = new Map<number, { x: number; y: number }>();
		for (const n of this.nodos()) {
			map.set(n.id, {
				x: drag && drag.id === n.id ? n.x + drag.dx : n.x,
				y: drag && drag.id === n.id ? n.y + drag.dy : n.y,
			});
		}
		return map;
	});

	readonly bloqueoPositions = computed(() => {
		const drag = this.dragBloqueoOffset();
		const map = new Map<number, { x: number; y: number }>();
		for (const b of this.bloqueos()) {
			map.set(b.id, {
				x: drag && drag.id === b.id ? b.x + drag.dx : b.x,
				y: drag && drag.id === b.id ? b.y + drag.dy : b.y,
			});
		}
		return map;
	});

	readonly nodeColorMap = computed(() => {
		const map = new Map<number, string>();
		for (const n of this.nodos()) map.set(n.id, getNodeColorHelper(n.tipo));
		return map;
	});

	readonly nodeLabelMap = computed(() => {
		const map = new Map<number, string>();
		for (const n of this.nodos()) map.set(n.id, getNodeLabelHelper(n));
		return map;
	});

	// #endregion

	// #region SVG helpers

	private clientToSvg(clientX: number, clientY: number) {
		return clientToSvgHelper(this.svgRef()?.nativeElement, clientX, clientY);
	}

	private svgToScreen(svgX: number, svgY: number) {
		return svgToScreenHelper(this.svgRef()?.nativeElement, svgX, svgY);
	}

	// #endregion

	// #region Event handlers

	onSvgClick(event: MouseEvent): void {
		if (this.dragStarted || this.dragBloqueoStarted) {
			this.dragStarted = false;
			this.dragBloqueoStarted = false;
			return;
		}
		const pos = this.clientToSvg(event.clientX, event.clientY);
		this.editorClick.emit(pos);
	}

	onNodePointerDown(event: PointerEvent, nodeId: number): void {
		if (event.button !== 0 || this.activeTool() !== 'select') return;
		event.stopPropagation();
		event.preventDefault();

		this.isDragging = true;
		this.dragNodeId = nodeId;
		this.dragStarted = false;
		this.hoverInfo.set(null);
		this.panStart = this.clientToSvg(event.clientX, event.clientY);
	}

	onNodeClick(event: MouseEvent, nodeId: number): void {
		event.stopPropagation();
		if (this.dragStarted) {
			this.dragStarted = false;
			return;
		}
		this.nodeClick.emit(nodeId);
	}

	onNodeDblClick(event: MouseEvent, nodeId: number): void {
		event.stopPropagation();
		this.nodeDblClick.emit(nodeId);
	}

	onAristaClick(event: MouseEvent, aristaId: number): void {
		event.stopPropagation();
		this.aristaClick.emit(aristaId);
	}

	onBloqueoClick(event: MouseEvent, bloqueoId: number): void {
		event.stopPropagation();
		if (this.dragBloqueoStarted) {
			this.dragBloqueoStarted = false;
			return;
		}
		this.bloqueoClick.emit(bloqueoId);
	}

	onBloqueoDblClick(event: MouseEvent, bloqueoId: number): void {
		event.stopPropagation();
		this.bloqueoDblClick.emit(bloqueoId);
	}

	// Handlers de hover
	onNodeMouseEnter(nodeId: number): void {
		if (this.isDragging || this.isPanning) return;
		const nodo = this.nodoMap().get(nodeId);
		if (!nodo) return;
		this.hoverInfo.set({ type: 'node', id: nodeId });
		const tip = computeNodeTipPoint(this.nodePositions().get(nodeId)!, nodo);
		const pos = this.svgToScreen(tip.x, tip.y);
		this.tooltipPos.set({ x: pos.x + 8, y: pos.y });
	}

	onBloqueoMouseEnter(bloqueoId: number): void {
		if (this.isDraggingBloqueo || this.isPanning) return;
		const bloqueo = this.bloqueos().find((b) => b.id === bloqueoId);
		if (!bloqueo) return;
		this.hoverInfo.set({ type: 'bloqueo', id: bloqueoId });
		const tip = computeBloqueoTipPoint(this.bloqueoPositions().get(bloqueoId)!, bloqueo);
		const pos = this.svgToScreen(tip.x, tip.y);
		this.tooltipPos.set({ x: pos.x + 8, y: pos.y });
	}

	onAristaMouseEnter(aristaId: number): void {
		if (this.isPanning) return;
		const arista = this.aristas().find((a) => a.id === aristaId);
		if (!arista) return;
		const origen = this.nodoMap().get(arista.nodoOrigenId);
		const destino = this.nodoMap().get(arista.nodoDestinoId);
		if (!origen || !destino) return;
		this.hoverInfo.set({ type: 'arista', id: aristaId });
		const op = this.nodePositions().get(arista.nodoOrigenId)!;
		const dp = this.nodePositions().get(arista.nodoDestinoId)!;
		this.tooltipPos.set(computeAristaTooltipScreenPos(this.svgRef()?.nativeElement, op, dp));
	}

	onElementMouseLeave(): void {
		this.hoverInfo.set(null);
	}

	onBloqueoPointerDown(event: PointerEvent, bloqueoId: number): void {
		if (event.button !== 0 || this.activeTool() !== 'select') return;
		event.stopPropagation();
		event.preventDefault();

		this.isDraggingBloqueo = true;
		this.dragBloqueoId = bloqueoId;
		this.dragBloqueoStarted = false;
		this.hoverInfo.set(null);
		this.panStart = this.clientToSvg(event.clientX, event.clientY);
	}

	onSvgPointerDown(event: PointerEvent): void {
		this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		const isBusyDragging = this.isDragging || this.isDraggingBloqueo;
		const gesture = classifyPointerGesture(this.activePointers.size, event, isBusyDragging);

		if (gesture === 'pinch-start') {
			this.isPanning = false;
			this.isDragging = false;
			this.isDraggingBloqueo = false;
			this.hoverInfo.set(null);
			this.pinchStartDistance = computePointerDistance([...this.activePointers.values()]);
			this.pinchStartViewBox = this.viewBox();
			return;
		}

		if (gesture === 'touch-pan' || gesture === 'desktop-pan') {
			this.isPanning = true;
			this.panStart = { x: event.clientX, y: event.clientY };
			this.hoverInfo.set(null);
			if (gesture === 'desktop-pan') event.preventDefault();
		}
	}

	private handlePinchZoom(): void {
		if (this.pinchStartDistance === 0) return;
		const pts = [...this.activePointers.values()];
		const distance = computePointerDistance(pts);
		if (distance === 0) return;
		const center = computePointerCenter(pts);
		const svgCenter = this.clientToSvg(center.x, center.y);
		const zoomFactor = this.pinchStartDistance / distance;
		this.viewBox.set(computeZoomedViewBox(this.pinchStartViewBox, svgCenter, zoomFactor));
	}

	onPointerMove(event: PointerEvent): void {
		if (this.activePointers.has(event.pointerId)) {
			this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		}

		if (this.activePointers.size === 2) {
			this.handlePinchZoom();
			return;
		}

		if (this.isDragging && this.dragNodeId !== null) {
			const d = computeDragDeltaHelper(this.clientToSvg(event.clientX, event.clientY), this.panStart);
			if (d) { this.dragStarted = true; this.dragOffset.set({ id: this.dragNodeId, ...d }); }
			return;
		}
		if (this.isDraggingBloqueo && this.dragBloqueoId !== null) {
			const d = computeDragDeltaHelper(this.clientToSvg(event.clientX, event.clientY), this.panStart);
			if (d) { this.dragBloqueoStarted = true; this.dragBloqueoOffset.set({ id: this.dragBloqueoId, ...d }); }
			return;
		}
		if (!this.isPanning) return;
		const vb = this.viewBox();
		const svgEl = this.svgRef()?.nativeElement;
		if (!svgEl) return;
		const scale = vb.w / svgEl.clientWidth;
		const dx = (this.panStart.x - event.clientX) * scale;
		const dy = (this.panStart.y - event.clientY) * scale;
		this.viewBox.set({ x: vb.x + dx, y: vb.y + dy, w: vb.w, h: vb.h });
		this.panStart = { x: event.clientX, y: event.clientY };
	}

	onPointerUp(event: PointerEvent): void {
		this.activePointers.delete(event.pointerId);

		if (this.activePointers.size < 2) {
			this.pinchStartDistance = 0;
		}
		if (this.activePointers.size > 0) {
			// Sigue quedando al menos un dedo apoyado: no cerrar drag/pan todavía.
			return;
		}

		if (this.isDragging && this.dragNodeId !== null && this.dragStarted) {
			const offset = this.dragOffset();
			const nodo = offset ? this.nodoMap().get(this.dragNodeId) : null;
			if (offset && nodo) this.nodeMoved.emit(computeMovedPayload(this.dragNodeId, nodo, offset));
		}
		if (this.isDraggingBloqueo && this.dragBloqueoId !== null && this.dragBloqueoStarted) {
			const offset = this.dragBloqueoOffset();
			const bloqueo = offset ? this.bloqueos().find((b) => b.id === this.dragBloqueoId) : null;
			if (offset && bloqueo) this.bloqueoMoved.emit(computeMovedPayload(this.dragBloqueoId, bloqueo, offset));
		}
		this.isDragging = false;
		this.dragNodeId = null;
		this.dragOffset.set(null);
		this.isDraggingBloqueo = false;
		this.dragBloqueoId = null;
		this.dragBloqueoOffset.set(null);
		this.isPanning = false;
	}

	onWheel(event: WheelEvent): void {
		event.preventDefault();
		this.hoverInfo.set(null);
		const svgPos = this.clientToSvg(event.clientX, event.clientY);
		const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
		this.viewBox.set(computeZoomedViewBox(this.viewBox(), svgPos, zoomFactor));
	}

	// #endregion
}
