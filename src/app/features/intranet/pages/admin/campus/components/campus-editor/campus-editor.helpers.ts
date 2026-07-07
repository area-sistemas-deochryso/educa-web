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
