import { CampusNodoDto, CampusAristaDto, CampusBloqueoDto } from '../../models';

export const NODE_COLORS: Record<string, string> = {
	classroom: '#4f46e5',
	corridor: '#6b7280',
	stairs: '#f59e0b',
	entrance: '#10b981',
	patio: '#06b6d4',
	bathroom: '#8b5cf6',
	office: '#ec4899',
};

export const NODE_TYPE_LABELS: Record<string, string> = {
	classroom: 'Aula',
	corridor: 'Pasillo',
	stairs: 'Escalera',
	entrance: 'Entrada',
	patio: 'Patio',
	bathroom: 'Baño',
	office: 'Oficina',
};

export function getNodeColor(tipo: string): string {
	return NODE_COLORS[tipo] ?? '#6b7280';
}

export function getNodeLabel(nodo: CampusNodoDto): string {
	return nodo.etiqueta || nodo.salonDescripcion || '';
}

/** Convert browser client coords to SVG viewBox coords */
export function clientToSvg(svgEl: SVGSVGElement | undefined, clientX: number, clientY: number) {
	if (!svgEl) return { x: 0, y: 0 };
	const pt = svgEl.createSVGPoint();
	pt.x = clientX;
	pt.y = clientY;
	const svgPt = pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
	return { x: svgPt.x, y: svgPt.y };
}

/** Convert SVG viewBox coords to pixel position relative to the SVG element */
export function svgToScreen(svgEl: SVGSVGElement | undefined, svgX: number, svgY: number) {
	if (!svgEl) return { x: 0, y: 0 };
	const pt = svgEl.createSVGPoint();
	pt.x = svgX;
	pt.y = svgY;
	const screenPt = pt.matrixTransform(svgEl.getScreenCTM()!);
	const rect = svgEl.getBoundingClientRect();
	return { x: screenPt.x - rect.left, y: screenPt.y - rect.top };
}

export interface ViewBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Distancia euclidiana entre los dos primeros pointers activos (pinch-zoom) */
export function computePointerDistance(pts: { x: number; y: number }[]): number {
	if (pts.length < 2) return 0;
	return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
}

/** Punto medio entre los dos primeros pointers activos (pinch-zoom) */
export function computePointerCenter(pts: { x: number; y: number }[]): { x: number; y: number } {
	return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
}

/** Nuevo viewBox al aplicar un factor de zoom centrado en un punto del espacio SVG */
export function computeZoomedViewBox(startVb: ViewBox, svgCenter: { x: number; y: number }, zoomFactor: number): ViewBox {
	const newW = startVb.w * zoomFactor;
	const newH = startVb.h * zoomFactor;
	const newX = svgCenter.x - (svgCenter.x - startVb.x) * zoomFactor;
	const newY = svgCenter.y - (svgCenter.y - startVb.y) * zoomFactor;
	return { x: newX, y: newY, w: newW, h: newH };
}

/** Delta arrastrado desde `panStart`, o null si está bajo el umbral de tap (2px) */
export function computeDragDelta(pos: { x: number; y: number }, panStart: { x: number; y: number }): { dx: number; dy: number } | null {
	const dx = pos.x - panStart.x;
	const dy = pos.y - panStart.y;
	return (Math.abs(dx) > 2 || Math.abs(dy) > 2) ? { dx, dy } : null;
}

/** Payload redondeado a emitir cuando termina un arrastre (nodo o bloqueo) */
export function computeMovedPayload(id: number, entity: { x: number; y: number }, offset: { dx: number; dy: number }): { id: number; x: number; y: number } {
	return { id, x: Math.round(entity.x + offset.dx), y: Math.round(entity.y + offset.dy) };
}

export type PointerGesture = 'pinch-start' | 'touch-pan' | 'desktop-pan' | 'none';

/** Determina qué gesto de puntero arranca según pointers activos, tipo y modificadores */
export function classifyPointerGesture(
	activePointerCount: number,
	event: { pointerType: string; button: number; shiftKey: boolean },
	isBusyDragging: boolean,
): PointerGesture {
	if (activePointerCount === 2) return 'pinch-start';
	if (event.pointerType === 'touch' && activePointerCount === 1 && !isBusyDragging) return 'touch-pan';
	if (event.button === 1 || (event.button === 0 && event.shiftKey)) return 'desktop-pan';
	return 'none';
}

/** Punto (en espacio SVG) donde anclar el tooltip de un nodo */
export function computeNodeTipPoint(np: { x: number; y: number }, nodo: { width: number; height: number }): { x: number; y: number } {
	return {
		x: np.x + (nodo.width > 0 ? nodo.width / 2 : 8),
		y: np.y - (nodo.height > 0 ? nodo.height / 2 : 8),
	};
}

/** Punto (en espacio SVG) donde anclar el tooltip de un bloqueo */
export function computeBloqueoTipPoint(bp: { x: number; y: number }, bloqueo: { width: number }): { x: number; y: number } {
	return { x: bp.x + bloqueo.width, y: bp.y };
}

/** Punto (en espacio SVG) donde anclar el tooltip de una arista, con offset propio de "arriba a la izquierda" */
export function computeAristaTooltipScreenPos(
	svgEl: SVGSVGElement | undefined,
	op: { x: number; y: number },
	dp: { x: number; y: number },
): { x: number; y: number } {
	const pos = svgToScreen(svgEl, (op.x + dp.x) / 2, (op.y + dp.y) / 2);
	return { x: pos.x + 8, y: pos.y - 8 };
}

export interface TooltipData {
	color: string;
	type: string;
	label: string;
	meta: string;
}

export function computeTooltipData(
	hoverInfo: { type: 'node' | 'arista' | 'bloqueo'; id: number } | null,
	nodoMap: Map<number, CampusNodoDto>,
	nodeColorMap: Map<number, string>,
	nodeTypeLabelMap: Record<string, string>,
	bloqueos: CampusBloqueoDto[],
	aristas: CampusAristaDto[],
): TooltipData | null {
	if (!hoverInfo) return null;

	if (hoverInfo.type === 'node') {
		const nodo = nodoMap.get(hoverInfo.id);
		if (!nodo) return null;
		const size = nodo.width > 0 ? ` · ${nodo.width}×${nodo.height}` : '';
		return {
			color: nodeColorMap.get(hoverInfo.id) ?? getNodeColor(nodo.tipo),
			type: nodeTypeLabelMap[nodo.tipo] || nodo.tipo,
			label: nodo.etiqueta || nodo.salonDescripcion || '',
			meta: `${Math.round(nodo.x)}, ${Math.round(nodo.y)}${size}`,
		};
	}

	if (hoverInfo.type === 'bloqueo') {
		const bloqueo = bloqueos.find((b) => b.id === hoverInfo.id);
		if (!bloqueo) return null;
		return {
			color: '#ef4444',
			type: 'Bloqueo',
			label: bloqueo.motivo || '',
			meta: `${bloqueo.width} × ${bloqueo.height}`,
		};
	}

	if (hoverInfo.type === 'arista') {
		const arista = aristas.find((a) => a.id === hoverInfo.id);
		if (!arista) return null;
		return {
			color: '#6b7280',
			type: arista.bidireccional ? 'Arista ↔' : 'Arista →',
			label: '',
			meta: `Dist: ${arista.peso}`,
		};
	}

	return null;
}
