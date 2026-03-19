import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

import { TooltipModule } from 'primeng/tooltip';

import { CampusNodoDto, CampusAristaDto, CampusBloqueoDto, EditorTool } from '../../models';

@Component({
	selector: 'app-campus-editor',
	standalone: true,
	imports: [TooltipModule],
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

	// Drag state (nodes)
	private isDragging = false;
	private dragNodeId: number | null = null;
	private dragStarted = false;
	readonly dragOffset = signal<{ id: number; dx: number; dy: number } | null>(null);

	// Drag state (bloqueos)
	private isDraggingBloqueo = false;
	private dragBloqueoId: number | null = null;
	private dragBloqueoStarted = false;
	readonly dragBloqueoOffset = signal<{ id: number; dx: number; dy: number } | null>(null);

	// Hover tooltip
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

	private readonly nodeTypeLabelMap: Record<string, string> = {
		classroom: 'Aula',
		corridor: 'Pasillo',
		stairs: 'Escalera',
		entrance: 'Entrada',
		patio: 'Patio',
		bathroom: 'Baño',
		office: 'Oficina',
	};

	readonly tooltipData = computed(() => {
		const info = this.hoverInfo();
		if (!info) return null;

		if (info.type === 'node') {
			const nodo = this.nodoMap().get(info.id);
			if (!nodo) return null;
			const size = nodo.width > 0 ? ` · ${nodo.width}×${nodo.height}` : '';
			return {
				color: this.getNodeColor(nodo.tipo),
				type: this.nodeTypeLabelMap[nodo.tipo] || nodo.tipo,
				label: nodo.etiqueta || nodo.salonDescripcion || '',
				meta: `${Math.round(nodo.x)}, ${Math.round(nodo.y)}${size}`,
			};
		}

		if (info.type === 'bloqueo') {
			const bloqueo = this.bloqueos().find((b) => b.id === info.id);
			if (!bloqueo) return null;
			return {
				color: '#ef4444',
				type: 'Bloqueo',
				label: bloqueo.motivo || '',
				meta: `${bloqueo.width} × ${bloqueo.height}`,
			};
		}

		if (info.type === 'arista') {
			const arista = this.aristas().find((a) => a.id === info.id);
			if (!arista) return null;
			return {
				color: '#6b7280',
				type: arista.bidireccional ? 'Arista ↔' : 'Arista →',
				label: '',
				meta: `Dist: ${arista.peso}`,
			};
		}

		return null;
	});

	// #endregion

	// #region SVG helpers

	getNodeColor(tipo: string): string {
		switch (tipo) {
			case 'classroom':
				return '#4f46e5';
			case 'corridor':
				return '#6b7280';
			case 'stairs':
				return '#f59e0b';
			case 'entrance':
				return '#10b981';
			case 'patio':
				return '#06b6d4';
			case 'bathroom':
				return '#8b5cf6';
			case 'office':
				return '#ec4899';
			default:
				return '#6b7280';
		}
	}

	getNodeLabel(nodo: CampusNodoDto): string {
		if (nodo.etiqueta) return nodo.etiqueta;
		if (nodo.salonDescripcion) return nodo.salonDescripcion;
		return '';
	}

	/** Get display position accounting for active drag offset */
	getNodeX(nodo: CampusNodoDto): number {
		const drag = this.dragOffset();
		return drag && drag.id === nodo.id ? nodo.x + drag.dx : nodo.x;
	}

	getNodeY(nodo: CampusNodoDto): number {
		const drag = this.dragOffset();
		return drag && drag.id === nodo.id ? nodo.y + drag.dy : nodo.y;
	}

	getBloqueoX(bloqueo: CampusBloqueoDto): number {
		const drag = this.dragBloqueoOffset();
		return drag && drag.id === bloqueo.id ? bloqueo.x + drag.dx : bloqueo.x;
	}

	getBloqueoY(bloqueo: CampusBloqueoDto): number {
		const drag = this.dragBloqueoOffset();
		return drag && drag.id === bloqueo.id ? bloqueo.y + drag.dy : bloqueo.y;
	}

	private clientToSvg(clientX: number, clientY: number): { x: number; y: number } {
		const svgEl = this.svgRef()?.nativeElement;
		if (!svgEl) return { x: 0, y: 0 };
		const pt = svgEl.createSVGPoint();
		pt.x = clientX;
		pt.y = clientY;
		const svgPt = pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
		return { x: svgPt.x, y: svgPt.y };
	}

	/** Convert SVG coordinates to pixel position relative to the SVG element */
	private svgToScreen(svgX: number, svgY: number): { x: number; y: number } {
		const svgEl = this.svgRef()?.nativeElement;
		if (!svgEl) return { x: 0, y: 0 };
		const pt = svgEl.createSVGPoint();
		pt.x = svgX;
		pt.y = svgY;
		const screenPt = pt.matrixTransform(svgEl.getScreenCTM()!);
		const rect = svgEl.getBoundingClientRect();
		return { x: screenPt.x - rect.left, y: screenPt.y - rect.top };
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

	onNodeMouseDown(event: MouseEvent, nodeId: number): void {
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

	// Hover handlers
	onNodeMouseEnter(nodeId: number): void {
		if (this.isDragging || this.isPanning) return;
		const nodo = this.nodoMap().get(nodeId);
		if (!nodo) return;
		this.hoverInfo.set({ type: 'node', id: nodeId });
		const tipX = this.getNodeX(nodo) + (nodo.width > 0 ? nodo.width / 2 : 8);
		const tipY = this.getNodeY(nodo) - (nodo.height > 0 ? nodo.height / 2 : 8);
		const pos = this.svgToScreen(tipX, tipY);
		this.tooltipPos.set({ x: pos.x + 8, y: pos.y });
	}

	onBloqueoMouseEnter(bloqueoId: number): void {
		if (this.isDraggingBloqueo || this.isPanning) return;
		const bloqueo = this.bloqueos().find((b) => b.id === bloqueoId);
		if (!bloqueo) return;
		this.hoverInfo.set({ type: 'bloqueo', id: bloqueoId });
		const pos = this.svgToScreen(this.getBloqueoX(bloqueo) + bloqueo.width, this.getBloqueoY(bloqueo));
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
		const midX = (this.getNodeX(origen) + this.getNodeX(destino)) / 2;
		const midY = (this.getNodeY(origen) + this.getNodeY(destino)) / 2;
		const pos = this.svgToScreen(midX, midY);
		this.tooltipPos.set({ x: pos.x + 8, y: pos.y - 8 });
	}

	onElementMouseLeave(): void {
		this.hoverInfo.set(null);
	}

	onBloqueoMouseDown(event: MouseEvent, bloqueoId: number): void {
		if (event.button !== 0 || this.activeTool() !== 'select') return;
		event.stopPropagation();
		event.preventDefault();

		this.isDraggingBloqueo = true;
		this.dragBloqueoId = bloqueoId;
		this.dragBloqueoStarted = false;
		this.hoverInfo.set(null);
		this.panStart = this.clientToSvg(event.clientX, event.clientY);
	}

	onMouseMove(event: MouseEvent): void {
		// Handle node dragging
		if (this.isDragging && this.dragNodeId !== null) {
			const pos = this.clientToSvg(event.clientX, event.clientY);
			const dx = pos.x - this.panStart.x;
			const dy = pos.y - this.panStart.y;
			if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
				this.dragStarted = true;
				this.dragOffset.set({ id: this.dragNodeId, dx, dy });
			}
			return;
		}

		// Handle bloqueo dragging
		if (this.isDraggingBloqueo && this.dragBloqueoId !== null) {
			const pos = this.clientToSvg(event.clientX, event.clientY);
			const dx = pos.x - this.panStart.x;
			const dy = pos.y - this.panStart.y;
			if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
				this.dragBloqueoStarted = true;
				this.dragBloqueoOffset.set({ id: this.dragBloqueoId, dx, dy });
			}
			return;
		}

		// Handle panning
		if (this.isPanning) {
			const vb = this.viewBox();
			const svgEl = this.svgRef()?.nativeElement;
			if (!svgEl) return;
			const scale = vb.w / svgEl.clientWidth;
			const dx = (this.panStart.x - event.clientX) * scale;
			const dy = (this.panStart.y - event.clientY) * scale;
			this.viewBox.set({ x: vb.x + dx, y: vb.y + dy, w: vb.w, h: vb.h });
			this.panStart = { x: event.clientX, y: event.clientY };
		}
	}

	onMouseUp(): void {
		// Finalize node drag
		if (this.isDragging && this.dragNodeId !== null && this.dragStarted) {
			const offset = this.dragOffset();
			if (offset) {
				const nodo = this.nodoMap().get(this.dragNodeId);
				if (nodo) {
					this.nodeMoved.emit({
						id: this.dragNodeId,
						x: Math.round(nodo.x + offset.dx),
						y: Math.round(nodo.y + offset.dy),
					});
				}
			}
		}

		// Finalize bloqueo drag
		if (this.isDraggingBloqueo && this.dragBloqueoId !== null && this.dragBloqueoStarted) {
			const offset = this.dragBloqueoOffset();
			if (offset) {
				const bloqueo = this.bloqueos().find((b) => b.id === this.dragBloqueoId);
				if (bloqueo) {
					this.bloqueoMoved.emit({
						id: this.dragBloqueoId,
						x: Math.round(bloqueo.x + offset.dx),
						y: Math.round(bloqueo.y + offset.dy),
					});
				}
			}
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
		const vb = this.viewBox();
		const svgPos = this.clientToSvg(event.clientX, event.clientY);
		const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
		const newW = vb.w * zoomFactor;
		const newH = vb.h * zoomFactor;
		// Zoom centered on mouse position in SVG space
		const newX = svgPos.x - (svgPos.x - vb.x) * zoomFactor;
		const newY = svgPos.y - (svgPos.y - vb.y) * zoomFactor;
		this.viewBox.set({ x: newX, y: newY, w: newW, h: newH });
	}

	onPanStart(event: MouseEvent): void {
		if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
			this.isPanning = true;
			this.panStart = { x: event.clientX, y: event.clientY };
			this.hoverInfo.set(null);
			event.preventDefault();
		}
	}

	// #endregion
}
