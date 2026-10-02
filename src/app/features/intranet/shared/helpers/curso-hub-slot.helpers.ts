import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

// #region Types
export interface SlotResolution {
	slot: HorarioProfesorDto | null;
	/** `horarioId` pedido por URL que no pertenece al par: se ignora y se avisa. */
	requestedInvalid: boolean;
}
// #endregion

// #region Constants
const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
// #endregion

// #region Time helpers
function toMinutes(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + m;
}

/** Minuto de la semana (lunes 00:00 = 0). Domingo cae al final de la semana. */
function weekMinute(date: Date): number {
	const dayIndex = (date.getDay() + 6) % 7;
	return dayIndex * MINUTES_PER_DAY + date.getHours() * 60 + date.getMinutes();
}

function slotStart(slot: HorarioProfesorDto): number {
	return (slot.diaSemana - 1) * MINUTES_PER_DAY + toMinutes(slot.horaInicio);
}

function slotEnd(slot: HorarioProfesorDto): number {
	return (slot.diaSemana - 1) * MINUTES_PER_DAY + toMinutes(slot.horaFin);
}
// #endregion

// #region Pair slots
/** Franjas del usuario que pertenecen al par (curso, salón), en orden semanal. */
export function filterPairSlots(
	horarios: readonly HorarioProfesorDto[],
	cursoId: number,
	salonId: number,
): HorarioProfesorDto[] {
	return horarios
		.filter((h) => h.cursoId === cursoId && h.salonId === salonId)
		.sort((a, b) => slotStart(a) - slotStart(b));
}
// #endregion

// #region Default slot
/**
 * Franja por defecto: la que está en curso; si ninguna lo está, la siguiente
 * futura (una franja ya terminada pasa a ser la de la semana siguiente, nunca
 * se elige como "actual").
 */
export function pickDefaultSlot(
	slots: readonly HorarioProfesorDto[],
	now: Date,
): HorarioProfesorDto | null {
	if (slots.length === 0) return null;

	const current = weekMinute(now);
	const inProgress = slots.find((s) => slotStart(s) <= current && current < slotEnd(s));
	if (inProgress) return inProgress;

	let best = slots[0];
	let bestDistance = Infinity;
	for (const slot of slots) {
		const distance = (slotStart(slot) - current + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
		if (distance < bestDistance) {
			best = slot;
			bestDistance = distance;
		}
	}
	return best;
}
// #endregion

// #region Resolution
/**
 * Resolución de franja del hub, en orden:
 * 1. `horarioId` pedido que pertenece al par.
 * 2. Única franja con contenido (solo si el sondeo ya terminó: `slotIdsWithContent`).
 * 3. Franja en curso → siguiente futura.
 *
 * `requestedId` es `null` si no vino en la URL; `NaN` si vino pero no es numérico.
 */
export function resolveSlot(
	slots: readonly HorarioProfesorDto[],
	requestedId: number | null,
	slotIdsWithContent: ReadonlySet<number> | null,
	now: Date,
): SlotResolution {
	if (slots.length === 0) return { slot: null, requestedInvalid: false };

	const requested = requestedId === null ? undefined : slots.find((s) => s.id === requestedId);
	if (requested) return { slot: requested, requestedInvalid: false };

	const requestedInvalid = requestedId !== null;

	if (slotIdsWithContent) {
		const withContent = slots.filter((s) => slotIdsWithContent.has(s.id));
		if (withContent.length === 1) return { slot: withContent[0], requestedInvalid };
	}

	return { slot: pickDefaultSlot(slots, now), requestedInvalid };
}
// #endregion
