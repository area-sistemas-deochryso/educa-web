// Decorative rotating palette shared by horarios timetable blocks and course cards.
// Hex literals required — darkenColor() in horarios operates with parseInt(hex) bitwise.
export const CURSO_COLORS = [
	'#3B82F6', '#10B981', '#F59E0B', '#EF4444',
	'#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

export function buildCursoColorMap(items: { cursoId: number }[]): Map<number, string> {
	const map = new Map<number, string>();
	let idx = 0;
	for (const item of items) {
		if (!map.has(item.cursoId)) {
			map.set(item.cursoId, CURSO_COLORS[idx % CURSO_COLORS.length]);
			idx++;
		}
	}
	return map;
}
