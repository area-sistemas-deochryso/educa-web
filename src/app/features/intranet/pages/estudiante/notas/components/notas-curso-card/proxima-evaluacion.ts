import type { CalificacionConMiNotaDto } from '@features/intranet/pages/estudiante/models';

/** Día calendario local `YYYY-MM-DD`: la lista llega con hora desde el BE, así que se compara solo el día. */
function dayKey(fecha: string | Date): string {
	if (typeof fecha === 'string') return fecha.slice(0, 10);
	const mm = String(fecha.getMonth() + 1).padStart(2, '0');
	const dd = String(fecha.getDate()).padStart(2, '0');
	return `${fecha.getFullYear()}-${mm}-${dd}`;
}

function dayNumber(key: string): number {
	const [y, m, d] = key.split('-').map(Number);
	return Date.UTC(y, m - 1, d) / 86_400_000;
}

/**
 * «Próxima evaluación» (P110-F24b): la de fecha más cercana con `fecha >= hoy`, sin nota y no vencida.
 * Una vencida entra como 0 y ya no se puede llenar (INV-C12), así que no es «próxima». `null` si no hay candidata.
 * El FE no evalúa el plazo: usa `vencida` del BE; la fecha solo ordena y descarta las ya pasadas.
 */
export function findProximaEvaluacion(
	evaluaciones: readonly CalificacionConMiNotaDto[],
	hoy: Date = new Date(),
): CalificacionConMiNotaDto | null {
	const hoyKey = dayKey(hoy);
	let proxima: CalificacionConMiNotaDto | null = null;
	for (const e of evaluaciones) {
		if (e.nota != null || e.vencida || !e.fechaEvaluacion) continue;
		const key = dayKey(e.fechaEvaluacion);
		if (key < hoyKey) continue;
		if (proxima === null || key < dayKey(proxima.fechaEvaluacion)) proxima = e;
	}
	return proxima;
}

/** «Hoy», «Mañana» o «En N días» según la distancia en días calendario. */
export function describirDistancia(fecha: string, hoy: Date = new Date()): string {
	const dias = dayNumber(dayKey(fecha)) - dayNumber(dayKey(hoy));
	if (dias <= 0) return 'Hoy';
	return dias === 1 ? 'Mañana' : `En ${dias} días`;
}
