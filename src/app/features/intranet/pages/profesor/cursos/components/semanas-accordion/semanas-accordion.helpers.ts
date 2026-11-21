import type { CursoContenidoSemanaDto } from '@features/intranet/pages/profesor/models';

export type SemanaFiltro = 'all' | 'study' | 'deliver';
export type SemanaEstado = 'actual' | 'pasada' | 'proxima';
export type FechaLimiteEstado = 'vencida' | 'pronto' | 'normal';

export interface SemanaResumen {
	individuales: number;
	grupales: number;
	examenes: number;
	/** Próxima fecha límite aún no vencida (ISO) o `null`. */
	proximaFecha: string | null;
	estado: SemanaEstado;
}

/** Contadores, próxima fecha y estado (respecto de la semana vigente) de cada semana, por id. */
export function buildResumenes(
	semanas: readonly CursoContenidoSemanaDto[],
	vigente: number | null,
	ahora = Date.now(),
): Map<number, SemanaResumen> {
	const map = new Map<number, SemanaResumen>();
	for (const s of semanas) {
		const examenes = s.tareas.filter((t) => t.tipo === 'EXAMEN').length;
		const trabajos = s.tareas.filter((t) => t.tipo !== 'EXAMEN');
		const grupales = trabajos.filter((t) => t.esGrupal).length;
		const proxima =
			s.tareas
				.map((t) => t.fechaLimite)
				.filter((f): f is string => !!f && new Date(f).getTime() >= ahora)
				.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
		const estado: SemanaEstado =
			vigente === null ? 'proxima' : s.numeroSemana === vigente ? 'actual' : s.numeroSemana < vigente ? 'pasada' : 'proxima';
		map.set(s.id, { individuales: trabajos.length - grupales, grupales, examenes, proximaFecha: proxima, estado });
	}
	return map;
}
