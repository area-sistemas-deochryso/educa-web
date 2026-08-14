import { EstadoSala, VideoconferenciaItem } from './videoconferencias.models';

/**
 * Ventana de gracia del rol moderador, en minutos. Debe coincidir con
 * `Videoconferencia:ModeratorGraceMinutes` en `appsettings.json` de `Educa.API`
 * (default 15) — es un espejo client-side para pintar el estado antes del click,
 * la validación real (y la única que importa para seguridad) ocurre server-side
 * en `VideoconferenciaGateService.ValidarVentanaHoraria`.
 */
export const MODERATOR_GRACE_MINUTES = 15;

function toBdDayOfWeek(date: Date): number {
	const dow = date.getDay();
	return dow === 0 ? 7 : dow;
}

function toMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
}

/** Réplica de `ValidarVentanaHoraria`: mismo día + hora actual dentro de [inicio - gracia, fin + gracia]. */
export function estaDentroDeVentana(
	item: Pick<VideoconferenciaItem, 'diaSemana' | 'horaInicio' | 'horaFin'>,
	graceMinutes: number,
	now = new Date(),
): boolean {
	if (toBdDayOfWeek(now) !== item.diaSemana) return false;

	const inicio = toMinutes(item.horaInicio) - graceMinutes;
	const fin = toMinutes(item.horaFin) + graceMinutes;
	const actual = now.getHours() * 60 + now.getMinutes();

	return actual >= inicio && actual <= fin;
}

/**
 * Estado real de la sala antes del click. El rol moderador tiene ventana ampliada y no
 * depende de su propio toggle de habilitación (mismo comportamiento que el gate server-side).
 */
export function resolveEstadoSala(item: VideoconferenciaItem, isModerator: boolean, now = new Date()): EstadoSala {
	const graceMinutes = isModerator ? MODERATOR_GRACE_MINUTES : 0;

	if (!estaDentroDeVentana(item, graceMinutes, now)) return 'fuera-de-horario';
	if (!isModerator && !item.habilitada) return 'no-habilitada';
	return 'disponible';
}
