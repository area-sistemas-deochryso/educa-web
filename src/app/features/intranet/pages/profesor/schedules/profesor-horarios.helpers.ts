import { HorarioProfesorDto } from '../models';

// #region Types
export interface HorarioBlock {
	id: number;
	cursoNombre: string;
	horaInicio: string;
	horaFin: string;
	salonId: number;
	salonDescripcion: string;
	cantidadEstudiantes: number;
	dia: number;
	color: string;
	borderColor: string;
	topPx: number;
	heightPx: number;
}

export type CountdownUrgency = 'normal' | 'warning' | 'danger-low' | 'danger';

export interface CountdownInfo {
	blockId: number;
	label: string;
	urgency: CountdownUrgency;
}
// #endregion

// #region Constants
const CURSO_COLORS = [
	'#3B82F6', '#10B981', '#F59E0B', '#EF4444',
	'#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

const HORA_INICIO_DIA = 7 * 60; // 07:00 en minutos
const PX_PER_HOUR = 60;
// #endregion

// #region Color helpers
function darkenColor(hex: string): string {
	const num = parseInt(hex.replace('#', ''), 16);
	const r = Math.max(0, (num >> 16) - 40);
	const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
	const b = Math.max(0, (num & 0x0000ff) - 40);
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
// #endregion

// #region Block builder
export function buildBlocks(
	horarios: HorarioProfesorDto[],
	estudiantesPorSalon: Map<number, number>,
): HorarioBlock[] {
	const colorMap = new Map<number, string>();
	let colorIdx = 0;

	return horarios.map((h) => {
		if (!colorMap.has(h.cursoId)) {
			colorMap.set(h.cursoId, CURSO_COLORS[colorIdx % CURSO_COLORS.length]);
			colorIdx++;
		}

		const [hi, mi] = h.horaInicio.split(':').map(Number);
		const [hf, mf] = h.horaFin.split(':').map(Number);
		const startMin = hi * 60 + mi;
		const endMin = hf * 60 + mf;
		const duration = endMin - startMin;
		const offset = startMin - HORA_INICIO_DIA;
		const color = colorMap.get(h.cursoId) || CURSO_COLORS[0];

		return {
			id: h.id,
			cursoNombre: h.cursoNombre,
			horaInicio: h.horaInicio,
			horaFin: h.horaFin,
			salonId: h.salonId,
			salonDescripcion: h.salonDescripcion,
			cantidadEstudiantes: estudiantesPorSalon.get(h.salonId) ?? h.cantidadEstudiantes,
			dia: h.diaSemana,
			color,
			borderColor: darkenColor(color),
			topPx: (offset / 60) * PX_PER_HOUR,
			heightPx: (duration / 60) * PX_PER_HOUR,
		};
	});
}
// #endregion

// #region Countdown
function timeToMinutes(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + m;
}

function getUrgency(remainingMs: number): CountdownUrgency {
	const mins = remainingMs / 60_000;
	if (mins < 10) return 'danger';
	if (mins < 30) return 'danger-low';
	if (mins < 60) return 'warning';
	return 'normal';
}

function formatCountdown(remainingMs: number): string {
	const totalSecs = Math.max(0, Math.floor(remainingMs / 1000));
	const d = Math.floor(totalSecs / 86400);
	const h = Math.floor((totalSecs % 86400) / 3600);
	const m = Math.floor((totalSecs % 3600) / 60);
	const s = totalSecs % 60;

	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

/** Calculate the next occurrence date for a block's day+time relative to now */
function getNextOccurrence(block: HorarioBlock, now: Date): Date {
	const jsDay = now.getDay();
	const todayDia = jsDay >= 1 && jsDay <= 5 ? jsDay : 0;
	const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
	const startMin = timeToMinutes(block.horaInicio);

	if (todayDia === block.dia && startMin > nowMinutes) {
		const d = new Date(now);
		d.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
		return d;
	}

	for (let offset = 1; offset <= 7; offset++) {
		const target = new Date(now);
		target.setDate(target.getDate() + offset);
		const targetJsDay = target.getDay();
		const targetDia = targetJsDay >= 1 && targetJsDay <= 5 ? targetJsDay : 0;
		if (targetDia === block.dia) {
			target.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
			return target;
		}
	}

	const fallback = new Date(now);
	fallback.setDate(fallback.getDate() + 7);
	fallback.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
	return fallback;
}

/**
 * Calcula countdown para cada bloque horario hacia su próxima ocurrencia.
 * Urgency se mapea a colores CSS: danger (<10min), danger-low (<30min), warning (<60min), normal (>60min).
 */
export function buildCountdownMap(blocks: HorarioBlock[], now: Date): Map<number, CountdownInfo> {
	const map = new Map<number, CountdownInfo>();
	for (const block of blocks) {
		const nextDate = getNextOccurrence(block, now);
		const remainingMs = nextDate.getTime() - now.getTime();
		map.set(block.id, {
			blockId: block.id,
			label: formatCountdown(remainingMs),
			urgency: getUrgency(remainingMs),
		});
	}
	return map;
}
// #endregion
