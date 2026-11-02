import type { Subject } from 'rxjs';

import { WalEntry, WalProcessResult } from './models';
import type { WalService } from './wal.service';

/**
 * Resultado del sync engine tras un 409 `IDEMPOTENCIA_EN_CURSO` (INV-S06), según el estado
 * que dejó `WalService.scheduleInFlightRetry`. Pura: no aplica efectos.
 */
export function inFlightOutcome(entry: WalEntry, updated: WalEntry | null): WalProcessResult {
	if (updated?.status === 'VERIFICACION_PENDIENTE') {
		return { status: 'VERIFICATION_PENDING', entryId: entry.id };
	}
	return {
		status: 'RETRYING',
		entryId: entry.id,
		retries: updated?.retries ?? entry.retries,
		nextRetryAt: updated?.nextRetryAt ?? Date.now(),
	};
}

/**
 * Maneja un 409 `IDEMPOTENCIA_EN_CURSO` con la misma clave (entry.id).
 * Sin markConflict, sin rollback y sin abrir el circuito (INV-WAL-RES04).
 * Al agotar los reintentos la entry queda en VERIFICACION_PENDIENTE: no sabemos si la
 * mutación confirmó, así que tampoco hay rollback; espera verificación manual.
 */
export async function handleInFlight(
	wal: Pick<WalService, 'scheduleInFlightRetry'>,
	processed$: Subject<WalProcessResult>,
	entry: WalEntry,
	error: unknown,
	cb: { onError: (error: unknown) => void } | undefined,
	callbacks: { delete(id: string): boolean },
): Promise<WalProcessResult> {
	const result = inFlightOutcome(entry, await wal.scheduleInFlightRetry(entry.id));
	if (result.status === 'VERIFICATION_PENDING') {
		cb?.onError(error);
		callbacks.delete(entry.id);
	}
	processed$.next(result);
	return result;
}
