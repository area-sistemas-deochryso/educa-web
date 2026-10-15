import type { CursoContenidoTareaDto } from '@features/intranet/pages/estudiante/models';

export type FechaLimiteEstado = 'vencida' | 'pronto' | 'normal';

const MS_POR_DIA = 86_400_000;
const DIAS_URGENTE = 2;

/** "Examen", "Actividad grupal", "Tarea individual"... */
export function tareaEtiqueta(tarea: CursoContenidoTareaDto): string {
	if (tarea.tipo === 'EXAMEN') return 'Examen';
	const base = tarea.tipo === 'ACTIVIDAD' ? 'Actividad' : 'Tarea';
	return `${base} ${tarea.esGrupal ? 'grupal' : 'individual'}`;
}

/** Urgencia de una fecha límite: vencida, vence en 2 días o menos, o sin apuro. */
export function fechaLimiteEstado(fecha: string | null): FechaLimiteEstado {
	if (!fecha) return 'normal';
	const diff = new Date(fecha).getTime() - Date.now();
	if (diff < 0) return 'vencida';
	return diff <= DIAS_URGENTE * MS_POR_DIA ? 'pronto' : 'normal';
}

/** Próxima fecha límite aún no vencida entre las tareas, o `null`. */
export function proximaFechaLimite(tareas: readonly CursoContenidoTareaDto[]): string | null {
	const ahora = Date.now();
	const futuras = tareas
		.map((t) => t.fechaLimite)
		.filter((f): f is string => !!f && new Date(f).getTime() >= ahora)
		.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
	return futuras[0] ?? null;
}

export function contarExamenes(tareas: readonly CursoContenidoTareaDto[]): number {
	return tareas.filter((t) => t.tipo === 'EXAMEN').length;
}
