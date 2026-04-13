import { CampusNodoDto } from '../../models';

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
