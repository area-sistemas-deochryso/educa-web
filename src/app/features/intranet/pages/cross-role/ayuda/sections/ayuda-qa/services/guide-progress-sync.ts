import { Observable, finalize, retry, throwError, timer } from 'rxjs';

import { logger } from '@core/helpers';

import { FaqProgresoBody, GuideProgress } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { clipGuideProgress } from '../helpers/faq-guide';

/** Agrupa marcas seguidas en un solo guardado: las escrituras tienen cuota por minuto (30/min). */
const DEBOUNCE_MS = 800;
/** Tope de la espera de un 503: `Retry-After` típico es de 1-5 s; más que esto no vale la pena esperarlo. */
const RETRY_AFTER_MAX_S = 10;
/** Clave de «sin avance»: el servidor borra el registro cuando `hechos` está vacío. */
const EMPTY_KEY = 'vacio';

/** Lo que el sincronizador necesita saber de una guía en el momento de enviar. */
export interface GuideProgressSnapshot {
	progress: GuideProgress | undefined;
	/** Cantidad de pasos que tiene la guía hoy; `0` si no tiene guía (no se envía nada). */
	total: number;
}

/**
 * Guarda en el servidor el avance de las guías (`PUT /api/faq/{id}/progreso`), con debounce por guía.
 *
 * No pasa por el WAL a propósito: el WAL es optimista **con rollback** (si falla, revierte lo que la persona
 * ve), y aquí es lo contrario — marcar un paso nunca se deshace por un fallo del servidor; el estado queda en
 * memoria y el siguiente cambio reenvía el estado completo (el PUT es idempotente y gana el último). Tampoco
 * hay cola offline: es estado de la sesión de lectura, no un dato de negocio que se pueda perder con costo.
 *
 * - Un solo `PUT` en vuelo por guía; si llega otro cambio mientras tanto, espera y envía lo último.
 * - No reenvía un estado idéntico al que el servidor ya confirmó.
 * - 503: un reintento tras `Retry-After` (tope `RETRY_AFTER_MAX_S`). 4xx/429/5xx: sin reintento aquí.
 * - Nunca avisa a la persona: los fallos solo se registran.
 */
export class GuideProgressSync {
	private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
	/** Clave de lo último que el servidor confirmó por guía. */
	private readonly savedKeys = new Map<number, string>();
	private readonly inFlight = new Set<number>();
	/** Guías que cambiaron mientras su `PUT` estaba en vuelo. */
	private readonly dirty = new Set<number>();

	constructor(
		private readonly save: (faqId: number, body: FaqProgresoBody) => Observable<unknown>,
		private readonly read: (faqId: number) => GuideProgressSnapshot,
	) {}

	/** Anota lo que el servidor ya tiene (al cargar), para no reenviarlo si la persona no lo cambia. */
	remember(faqId: number, body: FaqProgresoBody): void {
		this.savedKeys.set(faqId, keyOf(body));
	}

	/** Agenda el guardado de la guía; marcas seguidas reinician la espera. */
	schedule(faqId: number): void {
		clearTimeout(this.timers.get(faqId));
		this.timers.set(faqId, setTimeout(() => this.flush(faqId), DEBOUNCE_MS));
	}

	/** Envía ya lo que espera su debounce (al cambiar de pregunta o salir de la sección). */
	flushAll(): void {
		for (const faqId of [...this.timers.keys()]) this.flush(faqId);
	}

	private flush(faqId: number): void {
		clearTimeout(this.timers.get(faqId));
		this.timers.delete(faqId);
		if (this.inFlight.has(faqId)) {
			this.dirty.add(faqId);
			return;
		}

		const { progress, total } = this.read(faqId);
		if (total === 0) return;

		const { done, current } = clipGuideProgress(progress?.done ?? [], progress?.current, total);
		const body: FaqProgresoBody =
			done.length === 0
				? { hechos: [], totalPasos: total }
				: { hechos: done, totalPasos: total, ...(current === null ? {} : { actual: current }) };

		const key = keyOf(body);
		if (key === (this.savedKeys.get(faqId) ?? EMPTY_KEY)) return;

		this.inFlight.add(faqId);
		this.save(faqId, body)
			.pipe(
				retry({ count: 1, delay: (err) => (err?.status === 503 ? timer(retryAfterMs(err)) : throwError(() => err)) }),
				finalize(() => {
					this.inFlight.delete(faqId);
					if (this.dirty.delete(faqId)) this.flush(faqId);
				}),
			)
			.subscribe({
				next: () => this.savedKeys.set(faqId, key),
				error: (err) => logger.warn('[GuideProgressSync] Avance de guía sin guardar', err?.status),
			});
	}
}

/** Identidad de un avance para saber si ya está guardado; «sin pasos hechos» siempre es la misma. */
function keyOf(body: FaqProgresoBody): string {
	if (body.hechos.length === 0) return EMPTY_KEY;
	return JSON.stringify([body.hechos, body.actual ?? null, body.totalPasos]);
}

/** Espera pedida por el servidor en un 503 (`Retry-After` en segundos), con piso de 1 s y tope `RETRY_AFTER_MAX_S`. */
function retryAfterMs(err: { headers?: { get?: (name: string) => string | null } }): number {
	const seconds = Number(err?.headers?.get?.('Retry-After'));
	return Math.min(Number.isFinite(seconds) && seconds > 0 ? seconds : 1, RETRY_AFTER_MAX_S) * 1000;
}
