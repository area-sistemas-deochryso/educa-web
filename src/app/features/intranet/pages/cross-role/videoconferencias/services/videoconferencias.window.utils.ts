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
 *
 * Estudiante fuera del horario de clase: entra solo si el profesor habilitó la sala Y el BE reporta
 * la apertura vigente (`aperturaFueraDeHorario`: profesor presente o intervalo fijado). La apertura se
 * evalúa server-side al consultar los horarios — no se replica acá porque la presencia solo la conoce el BE.
 */
export function resolveEstadoSala(item: VideoconferenciaItem, isModerator: boolean, now = new Date()): EstadoSala {
	if (isModerator) {
		return estaDentroDeVentana(item, MODERATOR_GRACE_MINUTES, now) ? 'disponible' : 'fuera-de-horario';
	}

	if (estaDentroDeVentana(item, 0, now)) return item.habilitada ? 'disponible' : 'no-habilitada';

	if (!item.habilitada) return 'fuera-de-horario';
	return item.aperturaFueraDeHorario ? 'disponible' : 'esperando-apertura';
}

/** `true` si el moderador está fuera del horario de clase exacto (sin gracia): la apertura a estudiantes requiere motivo. */
export function estaFueraDeHorarioDeClase(
	item: Pick<VideoconferenciaItem, 'diaSemana' | 'horaInicio' | 'horaFin'>,
	now = new Date(),
): boolean {
	return !estaDentroDeVentana(item, 0, now);
}

/**
 * Formatea una fecha como hora de pared sin offset (`yyyy-MM-ddTHH:mm:00`), que es lo que el BE interpreta como
 * hora Perú para el intervalo de apertura. No usa `toISOString` porque convertiría a UTC y desplazaría la hora.
 */
export function toLocalIso(date: Date): string {
	const p = (n: number): string => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:00`;
}
