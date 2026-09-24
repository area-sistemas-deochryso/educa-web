import { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';
import { cursoColorFor } from '@intranet-shared/config/curso-colors';

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
	style: Record<string, string>;
	tooltip: string;
}
// #endregion

// #region Constants
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
	return horarios.map((h) => {
		const [hi, mi] = h.horaInicio.split(':').map(Number);
		const [hf, mf] = h.horaFin.split(':').map(Number);
		const startMin = hi * 60 + mi;
		const endMin = hf * 60 + mf;
		const duration = endMin - startMin;
		const offset = startMin - HORA_INICIO_DIA;
		const color = cursoColorFor(h.cursoId);
		const borderColor = darkenColor(color);
		const topPx = (offset / 60) * PX_PER_HOUR;
		const heightPx = (duration / 60) * PX_PER_HOUR;

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
			borderColor,
			topPx,
			heightPx,
			style: {
				top: `${topPx}px`,
				height: `${heightPx}px`,
				background: color,
				borderLeft: `4px solid ${borderColor}`,
			},
			tooltip: `${h.horaInicio} - ${h.horaFin}\n${h.salonDescripcion}`,
		};
	});
}
// #endregion

// #region Fecha / día de la semana
function timeToMinutes(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + m;
}

/** Día de bloque (1-5, lunes-viernes) correspondiente a `now`. Fin de semana colapsa a 0 (no matchea ningún bloque real). */
export function todayDia(now: Date): number {
	const jsDay = now.getDay();
	return jsDay >= 1 && jsDay <= 5 ? jsDay : 0;
}

/** Calcula la próxima fecha/hora en que ocurre un bloque, relativo a `now`. */
export function getNextOccurrence(block: HorarioBlock, now: Date): Date {
	const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
	const startMin = timeToMinutes(block.horaInicio);

	if (todayDia(now) === block.dia && startMin > nowMinutes) {
		const d = new Date(now);
		d.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
		return d;
	}

	for (let offset = 1; offset <= 7; offset++) {
		const target = new Date(now);
		target.setDate(target.getDate() + offset);
		if (todayDia(target) === block.dia) {
			target.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
			return target;
		}
	}

	const fallback = new Date(now);
	fallback.setDate(fallback.getDate() + 7);
	fallback.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
	return fallback;
}

/** Formatea una fecha como "yyyy-mm-dd" (formato esperado por los endpoints de asistencia). */
export function formatDateISO(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
// #endregion
